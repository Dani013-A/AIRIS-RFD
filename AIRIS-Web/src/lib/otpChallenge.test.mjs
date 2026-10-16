import test from "node:test";
import assert from "node:assert/strict";
import { hashOtp, verifyOtpHash } from "./otpAuth.ts";
import { evaluateOtpChallenge } from "./otpChallenge.ts";

process.env.OTP_SECRET_KEY ||= "test-only-otp-secret-for-unit-tests";

const now = 1_000_000;
const account = { uid: "student-1", email: "student@example.com", role: "student" };
const challenge = () => ({
  uid: account.uid, email: account.email, role: account.role,
  hashedOtp: hashOtp("123456"), attemptsCount: 0, maxAttempts: 5,
  expiresAt: now + 300_000, verified: false,
});

test("OTP challenge rejects cross-account, cross-role, and consumed codes", () => {
  assert.equal(evaluateOtpChallenge(challenge(), { ...account, uid: "other" }, "123456", now, verifyOtpHash).code, "NOT_FOUND");
  assert.equal(evaluateOtpChallenge(challenge(), { ...account, role: "admin" }, "123456", now, verifyOtpHash).code, "NOT_FOUND");
  assert.equal(evaluateOtpChallenge({ ...challenge(), verified: true }, account, "123456", now, verifyOtpHash).code, "ALREADY_USED");
});

test("OTP challenge expires and locks after five failures", () => {
  assert.equal(evaluateOtpChallenge({ ...challenge(), expiresAt: now - 1 }, account, "123456", now, verifyOtpHash).code, "EXPIRED");
  const fourthFailure = evaluateOtpChallenge({ ...challenge(), attemptsCount: 4 }, account, "000000", now, verifyOtpHash);
  assert.equal(fourthFailure.code, "MAX_ATTEMPTS");
  assert.equal(fourthFailure.update.locked, true);
  assert.equal(fourthFailure.update.attemptsCount, 5);
  assert.equal(evaluateOtpChallenge({ ...challenge(), attemptsCount: 5 }, account, "123456", now, verifyOtpHash).code, "MAX_ATTEMPTS");
});

test("valid OTP produces a consume update", () => {
  const decision = evaluateOtpChallenge(challenge(), account, "123456", now, verifyOtpHash);
  assert.equal(decision.code, "VERIFIED");
  assert.deepEqual(decision.update, { verified: true, consumedAt: now });
});
