import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const demoOtpChallengesTable = pgTable(
  "demo_otp_challenges",
  {
    phoneHash: text("phone_hash").primaryKey(),
    codeHash: text("code_hash").notNull(),
    verificationSessionHash: text("verification_session_hash")
      .notNull()
      .default(""),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    resendAt: timestamp("resend_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    usedAt: timestamp("used_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("demo_otp_challenges_updated_idx").on(table.updatedAt)],
);

export const demoOtpRateLimitsTable = pgTable(
  "demo_otp_rate_limits",
  {
    keyHash: text("key_hash").primaryKey(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("demo_otp_rate_limits_updated_idx").on(table.updatedAt)],
);
