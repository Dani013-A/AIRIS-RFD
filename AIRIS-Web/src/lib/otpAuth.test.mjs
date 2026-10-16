import test from "node:test";
import assert from "node:assert/strict";
import { hashOtp, verifyOtpHash, createOtpSessionToken, verifyOtpSessionToken, maskEmail } from "./otpAuth.ts";

process.env.OTP_SECRET_KEY ||= "test-only-otp-secret-for-unit-tests";

test("OTP operations fail closed without a configured secret", () => {
  const configured = process.env.OTP_SECRET_KEY;
  delete process.env.OTP_SECRET_KEY;
  try {
    assert.throws(() => hashOtp("123456"), /OTP_SECRET_KEY is required/);
    assert.throws(() => createOtpSessionToken("uid", "test@example.com"), /OTP_SECRET_KEY is required/);
  } finally {
    process.env.OTP_SECRET_KEY = configured;
  }
});

test("hashOtp and verifyOtpHash: produces consistent hash and verifies correctly", () => {
  const code = "123456";
  const hash = hashOtp(code);
  assert.ok(hash);
  assert.equal(typeof hash, "string");

  // Correct code matches
  assert.equal(verifyOtpHash("123456", hash), true);
  assert.equal(verifyOtpHash(" 123456 ", hash), true); // whitespace trimmed

  // Incorrect code does not match
  assert.equal(verifyOtpHash("654321", hash), false);
  assert.equal(verifyOtpHash("123455", hash), false);
  assert.equal(verifyOtpHash("", hash), false);
});

test("createOtpSessionToken and verifyOtpSessionToken: validates signed token and payload", () => {
  const uid = "admin-uid-123";
  const email = "danielespela251@gmail.com";
  const role = "admin";

  const token = createOtpSessionToken(uid, email, role);
  assert.ok(token);
  assert.equal(token.split(".").length, 2);

  const decoded = verifyOtpSessionToken(token);
  assert.ok(decoded);
  assert.equal(decoded.uid, uid);
  assert.equal(decoded.email, email);
  assert.equal(decoded.role, role);
  assert.ok(decoded.exp > Date.now());

  // Tampered token fails
  const tampered = token.slice(0, -4) + "abcd";
  assert.equal(verifyOtpSessionToken(tampered), null);

  // Random string fails
  assert.equal(verifyOtpSessionToken("invalid.token"), null);
  assert.equal(verifyOtpSessionToken(""), null);
  assert.equal(verifyOtpSessionToken(null), null);
});

test("maskEmail: masks email addresses cleanly for privacy", () => {
  assert.equal(maskEmail("danielespela251@gmail.com"), "d****1@gmail.com");
  assert.equal(maskEmail("al@tip.edu.ph"), "a*@tip.edu.ph");
  assert.equal(maskEmail("admin@airis.edu.ph"), "a***n@airis.edu.ph");
  assert.equal(maskEmail("invalid"), "your authorized email");
});
