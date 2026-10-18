import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export function createVerificationSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export function generateDifferentCode(
  phoneHash: string,
  previousHash?: string,
): string {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const code = randomInt(100_000, 1_000_000).toString();
    if (hashValue(`code:${phoneHash}:${code}`) !== previousHash) return code;
  }
  throw new Error("Unable to generate a unique OTP after repeated attempts.");
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function hashValue(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for demo OTP protection.");
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}
