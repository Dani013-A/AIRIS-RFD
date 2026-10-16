import crypto from "crypto";

const COOKIE_NAME = "airis_admin_otp_token";

export function assertOtpSecretConfigured(): string {
  const secret = process.env.OTP_SECRET_KEY;
  if (!secret) throw new Error("OTP_SECRET_KEY is required");
  return secret;
}

export interface OtpSessionPayload {
  uid: string;
  email: string;
  role: string;
  verifiedAt: number;
  exp: number;
}

/**
 * Computes a secure HMAC-SHA256 hash for storing the OTP.
 */
export function hashOtp(otp: string): string {
  return crypto.createHmac("sha256", assertOtpSecretConfigured()).update(otp.trim()).digest("hex");
}

/**
 * Constant-time comparison of candidate OTP against stored hash.
 */
export function verifyOtpHash(candidateOtp: string, storedHash: string): boolean {
  try {
    const candidateHash = hashOtp(candidateOtp);
    const candidateBuf = Buffer.from(candidateHash, "hex");
    const storedBuf = Buffer.from(storedHash, "hex");
    if (candidateBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(candidateBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Creates a signed verification session token.
 */
export function createOtpSessionToken(uid: string, email: string, role = "admin"): string {
  const payload: OtpSessionPayload = {
    uid,
    email,
    role,
    verifiedAt: Date.now(),
    exp: Date.now() + 8 * 3600 * 1000, // 8 hours session
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", assertOtpSecretConfigured()).update(payloadBase64).digest("base64url");
  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies and decodes the OTP verification session token.
 */
export function verifyOtpSessionToken(token: string | null | undefined): OtpSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, providedSig] = parts;

  try {
    const expectedSig = crypto.createHmac("sha256", assertOtpSecretConfigured()).update(payloadBase64).digest("base64url");
    const providedBuf = Buffer.from(providedSig);
    const expectedBuf = Buffer.from(expectedSig);

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return null;
    }

    const payload: OtpSessionPayload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Masks an email for safe display in the UI (e.g. "danielespela251@gmail.com" -> "d***1@gmail.com")
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "your authorized email";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${"*".repeat(Math.min(local.length - 2, 4))}${last}@${domain}`;
}

export { COOKIE_NAME };
