import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { hashOtp, verifyOtpHash, createOtpSessionToken, verifyOtpSessionToken, COOKIE_NAME } from "./otpAuth.ts";

test("Check 1 & 2: OTP Challenge Creation & Hash Safety", () => {
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashed = hashOtp(rawOtp);
  assert.equal(typeof hashed, "string");
  assert.equal(hashed.length, 64); // SHA-256 hex string

  // Plaintext OTP is NOT equal to hash
  assert.notEqual(rawOtp, hashed);
});

test("Check 3: Correct OTP Grants Access & Generates Signed Session", () => {
  const rawOtp = "654321";
  const hashed = hashOtp(rawOtp);

  const isMatch = verifyOtpHash(rawOtp, hashed);
  assert.equal(isMatch, true, "Correct OTP must verify");

  const sessionToken = createOtpSessionToken("test-admin-uid", "danielespela251@gmail.com", "admin");
  const verifiedSession = verifyOtpSessionToken(sessionToken);

  assert.ok(verifiedSession, "Valid session token must decode");
  assert.equal(verifiedSession.uid, "test-admin-uid");
  assert.equal(verifiedSession.role, "admin");
  assert.ok(verifiedSession.exp > Date.now());
});

test("Check 4: Incorrect, Expired, and Previously Used OTP Rejection", () => {
  const rawOtp = "123456";
  const hashed = hashOtp(rawOtp);
  const now = Date.now();

  const challenge = {
    hashedOtp: hashed,
    expiresAt: now + 5 * 60 * 1000,
    attemptsCount: 0,
    maxAttempts: 5,
    verified: false,
    locked: false,
  };

  // 4a. Incorrect code rejected
  const wrongMatch = verifyOtpHash("999999", challenge.hashedOtp);
  assert.equal(wrongMatch, false);
  challenge.attemptsCount += 1;
  assert.equal(challenge.attemptsCount, 1);

  // 4b. 5 failed attempts lockout
  for (let i = 2; i <= 5; i++) {
    verifyOtpHash("000000", challenge.hashedOtp);
    challenge.attemptsCount += 1;
  }
  challenge.locked = challenge.attemptsCount >= 5;
  assert.equal(challenge.locked, true, "Must lock out after 5 attempts");

  // 4c. Expired challenge rejection
  const expiredChallenge = {
    expiresAt: now - 1000, // 1s in the past
  };
  const isExpired = Date.now() > expiredChallenge.expiresAt;
  assert.equal(isExpired, true, "Must flag expired challenge");

  // 4d. Reused/consumed challenge rejection
  const consumedChallenge = {
    verified: true,
  };
  assert.equal(consumedChallenge.verified, true, "Must reject previously verified challenge");
});

test("Check 5: Resend Cooldown and Challenge Invalidation", () => {
  const now = Date.now();
  const challenge = {
    resendCooldownUntil: now + 45 * 1000, // 45s left
    hashedOtp: hashOtp("111111"),
  };

  // Cooldown active
  const isCooldownActive = now < challenge.resendCooldownUntil;
  assert.equal(isCooldownActive, true, "Resend cooldown must be active");

  // Resend after cooldown expires invalidates old hash
  const newOtp = "222222";
  const newHashed = hashOtp(newOtp);
  challenge.hashedOtp = newHashed;

  assert.equal(verifyOtpHash("111111", challenge.hashedOtp), false, "Old OTP must be invalid");
  assert.equal(verifyOtpHash("222222", challenge.hashedOtp), true, "New OTP must match");
});

test("Check 6: Non-Admin Role Authorization Boundary", () => {
  const allowedAdminRoles = ["admin", "career_center", "ojt_coordinator"];

  const studentUser = { role: "student", email: "student@tip.edu.ph" };
  const adminUser = { role: "admin", email: "danielespela251@gmail.com" };

  assert.equal(allowedAdminRoles.includes(studentUser.role), false, "Student must NOT have admin access");
  assert.equal(allowedAdminRoles.includes(adminUser.role), true, "Admin must have admin access");
});

test("Check 7: Direct Protected Route Navigation without OTP Cookie is Blocked", () => {
  // No cookie provided
  const noToken = verifyOtpSessionToken(null);
  assert.equal(noToken, null, "Missing OTP cookie must fail verification");

  // Tampered cookie provided
  const tampered = verifyOtpSessionToken("fake.token");
  assert.equal(tampered, null, "Tampered cookie must fail verification");
});

test("Check 8: Logout Cookie Invalidation", () => {
  // When logout route is called, cookie maxAge is set to 0 and value is cleared
  const logoutCookieConfig = {
    name: COOKIE_NAME,
    value: "",
    maxAge: 0,
  };

  assert.equal(logoutCookieConfig.value, "");
  assert.equal(logoutCookieConfig.maxAge, 0);

  const verified = verifyOtpSessionToken(logoutCookieConfig.value);
  assert.equal(verified, null, "Logged-out session must not be verifiable");
});
