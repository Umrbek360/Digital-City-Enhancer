import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUzbekPhone } from "../src/lib/uzbekPhone.ts";
import {
  constantTimeEqual,
  createVerificationSessionId,
  generateDifferentCode,
  hashValue,
} from "../src/lib/demoOtpCrypto.ts";

process.env.SESSION_SECRET = "unit-test-only-demo-otp-key";

test("normalizes common Uzbek phone formats consistently", () => {
  const expected = "+998901234567";
  assert.equal(normalizeUzbekPhone("+998 (90) 123-45-67"), expected);
  assert.equal(normalizeUzbekPhone("+998901234567"), expected);
  assert.equal(normalizeUzbekPhone("998 90 123 45 67"), expected);
  assert.equal(normalizeUzbekPhone("90 123-45-67"), expected);
});

test("rejects incomplete, foreign, and malformed phone numbers", () => {
  assert.equal(normalizeUzbekPhone("+998 (90) 123-45-6"), null);
  assert.equal(normalizeUzbekPhone("+1 202 555 0199"), null);
  assert.equal(normalizeUzbekPhone("+998 90 abc-45-67"), null);
  assert.equal(normalizeUzbekPhone("++998901234567"), null);
});

test("issues fresh session-bound identifiers in an unguessable format", () => {
  const first = createVerificationSessionId();
  const second = createVerificationSessionId();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
  assert.notEqual(
    hashValue(`verification-session:+998901234567:${first}`),
    hashValue(`verification-session:+998911234567:${first}`),
  );
});

test("generates a six-digit code different from the previous code hash", () => {
  const phoneHash = hashValue("phone:+998901234567");
  const previousHash = hashValue(`code:${phoneHash}:482731`);
  const nextCode = generateDifferentCode(phoneHash, previousHash);
  assert.match(nextCode, /^\d{6}$/);
  assert.notEqual(hashValue(`code:${phoneHash}:${nextCode}`), previousHash);
});

test("compares only equal-length HMAC digests in constant time", () => {
  const digest = hashValue("otp-test");
  assert.equal(constantTimeEqual(digest, digest), true);
  assert.equal(constantTimeEqual(digest, hashValue("different")), false);
  assert.equal(constantTimeEqual(digest, ""), false);
});
