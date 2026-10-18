import { eq, lt, sql } from "drizzle-orm";
import {
  db,
  demoOtpChallengesTable,
  demoOtpRateLimitsTable,
} from "@workspace/db";
import {
  constantTimeEqual,
  createVerificationSessionId,
  generateDifferentCode,
  hashValue,
} from "../lib/demoOtpCrypto";

const CODE_TTL_MS = 60_000;
const RESEND_DELAY_MS = 60_000;
const RATE_WINDOW_MS = 15 * 60_000;
const RATE_ROW_TTL_MS = 24 * 60 * 60_000;
const CHALLENGE_ROW_TTL_MS = 30 * 24 * 60 * 60_000;
const MAX_REQUESTS_PER_PHONE = 5;
const MAX_REQUESTS_PER_IP = 40;
const MAX_VERIFICATIONS_PER_PHONE = 10;
const MAX_VERIFICATIONS_PER_IP = 60;
const MAX_CODE_ATTEMPTS = 5;

export type OtpDelivery = {
  mode: "demo";
  demoCode: string;
};

export interface OtpProvider {
  deliver(phoneNumber: string, code: string): Promise<OtpDelivery>;
}

export class DemoOtpProvider implements OtpProvider {
  async deliver(_phoneNumber: string, code: string): Promise<OtpDelivery> {
    return { mode: "demo", demoCode: code };
  }
}

export class OtpServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly retryAt?: Date,
  ) {
    super(message);
    this.name = "OtpServiceError";
  }
}

export class DemoOtpService {
  constructor(private readonly provider: OtpProvider = new DemoOtpProvider()) {}

  async requestCode(
    phoneNumber: string,
    clientIp: string,
    requestedSessionId?: string,
  ): Promise<{
    demoCode: string;
    verificationSessionId: string;
    issuedAt: Date;
    expiresAt: Date;
    resendAt: Date;
  }> {
    const phoneHash = hashValue(`phone:${phoneNumber}`);
    const now = new Date();
    const issue = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${phoneHash})::bigint)`,
      );
      await pruneRateLimits(tx, now);

      const phoneAllowed = await consumeLimit(
        tx,
        `request:phone:${phoneHash}`,
        MAX_REQUESTS_PER_PHONE,
        now,
      );
      const ipAllowed = await consumeLimit(
        tx,
        `request:ip:${clientIp}`,
        MAX_REQUESTS_PER_IP,
        now,
      );
      if (!phoneAllowed || !ipAllowed) {
        return {
          error: new OtpServiceError(
            "OTP_RATE_LIMIT",
            "Juda ko‘p kod so‘raldi. Birozdan keyin qayta urinib ko‘ring.",
            429,
            new Date(now.getTime() + RATE_WINDOW_MS),
          ),
        };
      }

      const [existing] = await tx
        .select()
        .from(demoOtpChallengesTable)
        .where(eq(demoOtpChallengesTable.phoneHash, phoneHash))
        .limit(1);

      let verificationSessionId: string;
      let verificationSessionHash: string;
      if (requestedSessionId) {
        verificationSessionId = requestedSessionId;
        verificationSessionHash = hashValue(
          `verification-session:${phoneHash}:${verificationSessionId}`,
        );
        if (
          !existing ||
          !constantTimeEqual(
            existing.verificationSessionHash,
            verificationSessionHash,
          )
        ) {
          return {
            error: new OtpServiceError(
              "OTP_SESSION_MISMATCH",
              "Tasdiqlash seansi yaroqsiz. Yangi kod so‘rang.",
              400,
            ),
          };
        }
      } else {
        verificationSessionId = createVerificationSessionId();
        verificationSessionHash = hashValue(
          `verification-session:${phoneHash}:${verificationSessionId}`,
        );
      }

      if (existing && existing.resendAt.getTime() > now.getTime()) {
        return {
          error: new OtpServiceError(
            "OTP_COOLDOWN",
            "Yangi kodni 60 soniyadan keyin so‘rashingiz mumkin.",
            429,
            existing.resendAt,
          ),
        };
      }

      const sameSession =
        existing &&
        constantTimeEqual(
          existing.verificationSessionHash,
          verificationSessionHash,
        );
      const code = generateDifferentCode(
        phoneHash,
        sameSession ? existing.codeHash : undefined,
      );
      const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
      const resendAt = new Date(now.getTime() + RESEND_DELAY_MS);
      const codeHash = hashValue(`code:${phoneHash}:${code}`);

      await tx
        .insert(demoOtpChallengesTable)
        .values({
          phoneHash,
          codeHash,
          verificationSessionHash,
          expiresAt,
          resendAt,
          attempts: 0,
          usedAt: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: demoOtpChallengesTable.phoneHash,
          set: {
            codeHash,
            verificationSessionHash,
            expiresAt,
            resendAt,
            attempts: 0,
            usedAt: null,
            updatedAt: now,
          },
        });

      return { code, verificationSessionId, issuedAt: now, expiresAt, resendAt };
    });

    if ("error" in issue) throw issue.error;

    const delivery = await this.provider.deliver(phoneNumber, issue.code);
    return {
      demoCode: delivery.demoCode,
      verificationSessionId: issue.verificationSessionId,
      issuedAt: issue.issuedAt,
      expiresAt: issue.expiresAt,
      resendAt: issue.resendAt,
    };
  }

  async verifyCode(
    phoneNumber: string,
    verificationSessionId: string,
    code: string,
    clientIp: string,
  ): Promise<void> {
    const phoneHash = hashValue(`phone:${phoneNumber}`);
    const now = new Date();
    const verification = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${phoneHash})::bigint)`,
      );
      await pruneRateLimits(tx, now);

      const phoneAllowed = await consumeLimit(
        tx,
        `verify:phone:${phoneHash}`,
        MAX_VERIFICATIONS_PER_PHONE,
        now,
      );
      const ipAllowed = await consumeLimit(
        tx,
        `verify:ip:${clientIp}`,
        MAX_VERIFICATIONS_PER_IP,
        now,
      );
      if (!phoneAllowed || !ipAllowed) {
        return {
          error: new OtpServiceError(
            "OTP_RATE_LIMIT",
            "Tekshirish urinishlari chegarasiga yetdingiz. Birozdan keyin urinib ko‘ring.",
            429,
            new Date(now.getTime() + RATE_WINDOW_MS),
          ),
        };
      }

      const [challenge] = await tx
        .select()
        .from(demoOtpChallengesTable)
        .where(eq(demoOtpChallengesTable.phoneHash, phoneHash))
        .for("update")
        .limit(1);

      const verificationSessionHash = hashValue(
        `verification-session:${phoneHash}:${verificationSessionId}`,
      );
      if (
        !challenge ||
        !constantTimeEqual(
          challenge.verificationSessionHash,
          verificationSessionHash,
        )
      ) {
        return {
          error: new OtpServiceError(
            "OTP_SESSION_MISMATCH",
            "Telefon raqami yoki tasdiqlash seansi mos kelmadi.",
            400,
          ),
        };
      }

      if (!challenge || challenge.expiresAt.getTime() <= now.getTime()) {
        return {
          error: new OtpServiceError(
            "OTP_EXPIRED",
            "Tasdiqlash kodi eskirgan. Yangi kod so‘rang.",
            410,
          ),
        };
      }
      if (challenge.usedAt) {
        return {
          error: new OtpServiceError(
            "OTP_USED",
            "Bu tasdiqlash kodi avval ishlatilgan. Yangi kod so‘rang.",
            410,
          ),
        };
      }
      if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
        return {
          error: new OtpServiceError(
            "OTP_RATE_LIMIT",
            "Kod kiritish urinishlari tugadi. Yangi kod so‘rang.",
            429,
            challenge.resendAt,
          ),
        };
      }

      const candidateHash = hashValue(`code:${phoneHash}:${code}`);
      if (!constantTimeEqual(challenge.codeHash, candidateHash)) {
        await tx
          .update(demoOtpChallengesTable)
          .set({ attempts: challenge.attempts + 1, updatedAt: now })
          .where(eq(demoOtpChallengesTable.phoneHash, phoneHash));
        return {
          error: new OtpServiceError(
            "OTP_INVALID",
            "Tasdiqlash kodi noto‘g‘ri.",
            400,
          ),
        };
      }

      await tx
        .update(demoOtpChallengesTable)
        .set({
          attempts: challenge.attempts + 1,
          usedAt: now,
          updatedAt: now,
        })
        .where(eq(demoOtpChallengesTable.phoneHash, phoneHash));
      return { verified: true as const };
    });

    if ("error" in verification) throw verification.error;
  }
}

async function pruneRateLimits(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  now: Date,
) {
  await tx
    .delete(demoOtpRateLimitsTable)
    .where(
      lt(
        demoOtpRateLimitsTable.updatedAt,
        new Date(now.getTime() - RATE_ROW_TTL_MS),
      ),
    );
  await tx
    .delete(demoOtpChallengesTable)
    .where(
      lt(
        demoOtpChallengesTable.updatedAt,
        new Date(now.getTime() - CHALLENGE_ROW_TTL_MS),
      ),
    );
}

async function consumeLimit(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  key: string,
  maxAttempts: number,
  now: Date,
): Promise<boolean> {
  const keyHash = hashValue(`limit:${key}`);
  const resetBefore = new Date(now.getTime() - RATE_WINDOW_MS);
  const [record] = await tx
    .insert(demoOtpRateLimitsTable)
    .values({
      keyHash,
      windowStartedAt: now,
      attempts: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: demoOtpRateLimitsTable.keyHash,
      set: {
        windowStartedAt: sql`case when ${demoOtpRateLimitsTable.windowStartedAt} <= ${resetBefore} then ${now} else ${demoOtpRateLimitsTable.windowStartedAt} end`,
        attempts: sql`case when ${demoOtpRateLimitsTable.windowStartedAt} <= ${resetBefore} then 1 else ${demoOtpRateLimitsTable.attempts} + 1 end`,
        updatedAt: now,
      },
    })
    .returning({ attempts: demoOtpRateLimitsTable.attempts });

  return (record?.attempts ?? 0) <= maxAttempts;
}

