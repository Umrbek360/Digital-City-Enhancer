import { clerkClient } from "@clerk/express";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  RequestDemoOtpBody,
  RequestDemoOtpResponse,
  VerifyDemoOtpBody,
  VerifyDemoOtpResponse,
} from "@workspace/api-zod";
import { normalizeUzbekPhone } from "../lib/uzbekPhone";
import { DemoOtpService, OtpServiceError } from "../services/demoOtp";

const router: IRouter = Router();
const demoOtpService = new DemoOtpService();

router.post("/auth/demo-otp/request", async (req, res): Promise<void> => {
  if (!isDemoModeEnabled(res)) return;

  const parsed = RequestDemoOtpBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "INVALID_PHONE", "Telefon raqami noto‘g‘ri.");
    return;
  }
  const phone = normalizeUzbekPhone(parsed.data.phone);
  if (!phone) {
    sendError(res, 400, "INVALID_PHONE", "O‘zbekiston telefon raqamini to‘liq kiriting.");
    return;
  }

  try {
    const result = await demoOtpService.requestCode(
      phone,
      getClientIp(req),
      parsed.data.verificationSessionId,
    );
    res.json(
      RequestDemoOtpResponse.parse({
        demoCode: result.demoCode,
        verificationSessionId: result.verificationSessionId,
        serverTime: result.issuedAt.toISOString(),
        expiresAt: result.expiresAt.toISOString(),
        resendAt: result.resendAt.toISOString(),
      }),
    );
  } catch (error) {
    if (sendServiceError(res, error)) return;
    throw error;
  }
});

router.post("/auth/demo-otp/verify", async (req, res): Promise<void> => {
  if (!isDemoModeEnabled(res)) return;

  const parsed = VerifyDemoOtpBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "INVALID_CODE", "Telefon raqami yoki kod noto‘g‘ri.");
    return;
  }
  const phone = normalizeUzbekPhone(parsed.data.phone);
  if (!phone) {
    sendError(res, 400, "INVALID_PHONE", "O‘zbekiston telefon raqami noto‘g‘ri.");
    return;
  }

  try {
    await demoOtpService.verifyCode(
      phone,
      parsed.data.verificationSessionId,
      parsed.data.code,
      getClientIp(req),
    );

    const { data: users } = await clerkClient.users.getUserList({
      phoneNumber: [phone],
      limit: 2,
    });
    const matchingUsers = users.filter((user) =>
      user.phoneNumbers.some(
        (phoneNumber) =>
          phoneNumber.phoneNumber === phone &&
          phoneNumber.verification?.status === "verified",
      ),
    );

    if (matchingUsers.length === 0) {
      sendError(
        res,
        404,
        "ACCOUNT_NOT_FOUND",
        "Bu raqamga bog‘langan tasdiqlangan hisob topilmadi. Email orqali kiring yoki hisob yarating.",
      );
      return;
    }
    if (matchingUsers.length > 1) {
      sendError(
        res,
        409,
        "ACCOUNT_AMBIGUOUS",
        "Bu raqam bir nechta hisobga bog‘langan. Email orqali kiring.",
      );
      return;
    }

    const session = await clerkClient.sessions.createSession({
      userId: matchingUsers[0].id,
    });
    res.json(VerifyDemoOtpResponse.parse({ sessionId: session.id }));
  } catch (error) {
    if (sendServiceError(res, error)) return;
    req.log?.error({ err: error }, "Demo OTP account session creation failed");
    sendError(
      res,
      503,
      "SESSION_UNAVAILABLE",
      "Hisobga hozircha kirib bo‘lmadi. Yangi kod so‘rab qayta urinib ko‘ring.",
    );
  }
});

function isDemoModeEnabled(res: Response): boolean {
  if (process.env.NODE_ENV === "development") return true;
  sendError(
    res,
    404,
    "DEMO_OTP_DISABLED",
    "Demo OTP faqat ishlab chiqish muhitida ishlaydi.",
  );
  return false;
}

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function sendServiceError(res: Response, error: unknown): boolean {
  if (!(error instanceof OtpServiceError)) return false;
  res.status(error.status).json({
    code: error.code,
    message: error.message,
    ...(error.retryAt ? { retryAt: error.retryAt.toISOString() } : {}),
  });
  return true;
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
): void {
  res.status(status).json({ code, message });
}

export default router;
