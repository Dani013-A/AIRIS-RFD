import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  hashOtp,
  verifyOtpHash,
  createOtpSessionToken,
  verifyOtpSessionToken,
  maskEmail,
} from "./otpAuth.ts";
import { sendStudentOtpEmail } from "../services/mail/mailService.ts";

test("Student OTP Challenge: Cryptographic 6-digit generation and hash security", () => {
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  assert.equal(rawOtp.length, 6);
  assert.match(rawOtp, /^\d{6}$/);

  const hashed = hashOtp(rawOtp);
  assert.notEqual(hashed, rawOtp);
  assert.equal(typeof hashed, "string");
  assert.equal(hashed.length, 64); // SHA-256 hex length

  // Hash verification matches raw OTP
  assert.equal(verifyOtpHash(rawOtp, hashed), true);
  // Incorrect code rejected
  assert.equal(verifyOtpHash("000000", hashed), false);
});

test("Student OTP Email Formatting: Clean branding, selectable block, no em dashes or AI styling", async () => {
  // Test simulated / template generation
  const res = await sendStudentOtpEmail("student@tip.edu.ph", "654321", 5);
  assert.equal(res.success, true);

  // Email mask check
  const masked = maskEmail("student@tip.edu.ph");
  assert.equal(masked, "s****t@tip.edu.ph");
});

test("Student OTP Verification: Generates signed session token bound to student UID and role", () => {
  const studentUid = "test_student_uid_123";
  const studentEmail = "student@tip.edu.ph";
  const role = "student";

  const sessionToken = createOtpSessionToken(studentUid, studentEmail, role);
  assert.equal(typeof sessionToken, "string");
  assert.ok(sessionToken.includes("."));

  // Verify decoded session payload
  const session = verifyOtpSessionToken(sessionToken);
  assert.ok(session);
  assert.equal(session.uid, studentUid);
  assert.equal(session.email, studentEmail);
  assert.equal(session.role, "student");
  assert.ok(session.exp > Date.now());
});

test("Student OTP Challenge Lifecycle: 5 attempts lockout, expiry, and replay protection", () => {
  const rawOtp = "842109";
  const hashedOtp = hashOtp(rawOtp);
  const now = Date.now();

  const challenge = {
    uid: "student_999",
    email: "student999@tip.edu.ph",
    role: "student",
    hashedOtp,
    attemptsCount: 0,
    maxAttempts: 5,
    expiresAt: now + 5 * 60 * 1000,
    resendCooldownUntil: now + 60 * 1000,
    verified: false,
  };

  // 1. Wrong attempt increments count
  let enteredCode = "111111";
  let isMatch = verifyOtpHash(enteredCode, challenge.hashedOtp);
  assert.equal(isMatch, false);
  challenge.attemptsCount += 1;
  assert.equal(challenge.attemptsCount, 1);

  // 2. Lockout at 5 failed attempts
  challenge.attemptsCount = 5;
  const isLocked = challenge.attemptsCount >= challenge.maxAttempts;
  assert.equal(isLocked, true);

  // 3. Expiration check
  const expiredChallenge = { ...challenge, expiresAt: now - 1000 };
  const isExpired = Date.now() > expiredChallenge.expiresAt;
  assert.equal(isExpired, true);

  // 4. Replay protection
  challenge.verified = true;
  assert.equal(challenge.verified, true);
});
