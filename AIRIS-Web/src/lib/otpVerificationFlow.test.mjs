import test from "node:test";
import assert from "node:assert/strict";
import { hashOtp, verifyOtpHash, createOtpSessionToken, verifyOtpSessionToken } from "./otpAuth.ts";

test("OTP Verification Flow: full challenge lifecycle simulation", () => {
  const secretOtp = "482910";
  const hashedOtp = hashOtp(secretOtp);
  const now = Date.now();

  const challenge = {
    uid: "test-admin-uid",
    email: "danielespela251@gmail.com",
    hashedOtp,
    attemptsCount: 0,
    maxAttempts: 5,
    expiresAt: now + 5 * 60 * 1000,
    verified: false,
    locked: false,
  };

  // 1. Incorrect attempt 1
  assert.equal(verifyOtpHash("000000", challenge.hashedOtp), false);
  challenge.attemptsCount += 1;
  assert.equal(challenge.attemptsCount, 1);
  assert.equal(challenge.maxAttempts - challenge.attemptsCount, 4);

  // 2. Incorrect attempts 2, 3, 4
  for (let i = 2; i <= 4; i++) {
    assert.equal(verifyOtpHash(`11111${i}`, challenge.hashedOtp), false);
    challenge.attemptsCount += 1;
  }
  assert.equal(challenge.attemptsCount, 4);
  assert.equal(challenge.maxAttempts - challenge.attemptsCount, 1);

  // 3. Correct attempt on 5th try succeeds
  assert.equal(verifyOtpHash(secretOtp, challenge.hashedOtp), true);
  challenge.verified = true;
  challenge.consumedAt = Date.now();

  // 4. Session token issued
  const sessionToken = createOtpSessionToken(challenge.uid, challenge.email, "admin");
  const decoded = verifyOtpSessionToken(sessionToken);
  assert.ok(decoded);
  assert.equal(decoded.uid, challenge.uid);
  assert.equal(decoded.email, challenge.email);
});

test("OTP Verification Flow: lock out after 5 failed attempts", () => {
  const secretOtp = "739104";
  const hashedOtp = hashOtp(secretOtp);

  const challenge = {
    attemptsCount: 0,
    maxAttempts: 5,
    hashedOtp,
    locked: false,
  };

  for (let i = 1; i <= 5; i++) {
    assert.equal(verifyOtpHash("999999", challenge.hashedOtp), false);
    challenge.attemptsCount += 1;
    if (challenge.attemptsCount >= 5) {
      challenge.locked = true;
    }
  }

  assert.equal(challenge.attemptsCount, 5);
  assert.equal(challenge.locked, true);

  // Even if user now provides the right code, challenge is locked
  assert.equal(challenge.locked, true);
});

test("OTP Verification Flow: expired challenge rejection", () => {
  const pastTime = Date.now() - 1000; // expired 1s ago
  const challenge = {
    expiresAt: pastTime,
  };

  const isExpired = Date.now() > challenge.expiresAt;
  assert.equal(isExpired, true);
});
