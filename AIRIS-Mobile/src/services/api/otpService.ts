import AsyncStorage from "@react-native-async-storage/async-storage";
import { isProductionEnvironment } from "./apiClient";

export const PRODUCTION_WEB_URL = "https://admin.18-143-33-249.sslip.io";
const OTP_STORAGE_PREFIX = "@airis_student_otp_session_";

export function getOtpBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_ADMIN_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (isProductionEnvironment()) {
    return PRODUCTION_WEB_URL;
  }

  // Fallback for local development
  return "http://localhost:3000";
}

export interface SendOtpResult {
  success: boolean;
  maskedEmail?: string;
  cooldownSeconds?: number;
  expiresAt?: number;
  simulated?: boolean;
  error?: string;
  cooldownRemaining?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message?: string;
  sessionToken?: string;
  user?: {
    uid: string;
    email: string;
    role: string;
  };
  error?: string;
  code?: string;
  remainingAttempts?: number;
}

/**
 * Dispatches an email OTP challenge to the student's authorized email.
 */
export async function sendStudentOtp(idToken: string): Promise<SendOtpResult> {
  const baseUrl = getOtpBaseUrl();
  const url = `${baseUrl}/api/auth/otp/send`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error: data.error || "Failed to send verification code. Please try again.",
      cooldownRemaining: data.cooldownRemaining,
    };
  }

  return {
    success: true,
    maskedEmail: data.maskedEmail,
    cooldownSeconds: data.cooldownSeconds || 60,
    expiresAt: data.expiresAt,
    simulated: data.simulated,
  };
}

/**
 * Verifies the 6-digit OTP code against the server-side challenge.
 */
export async function verifyStudentOtp(idToken: string, code: string): Promise<VerifyOtpResult> {
  const baseUrl = getOtpBaseUrl();
  const url = `${baseUrl}/api/auth/otp/verify`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ idToken, code: code.trim() }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error: data.error || "Verification failed. Please check the code and try again.",
      code: data.code,
      remainingAttempts: data.remainingAttempts,
    };
  }

  return {
    success: true,
    message: data.message,
    sessionToken: data.sessionToken,
    user: data.user,
  };
}

/**
 * Safely persists verified OTP session token in AsyncStorage bound to the UID.
 */
export async function storeStudentOtpSession(
  uid: string,
  sessionToken: string,
  expiresAt: number
): Promise<void> {
  try {
    const payload = JSON.stringify({ sessionToken, expiresAt, storedAt: Date.now() });
    await AsyncStorage.setItem(`${OTP_STORAGE_PREFIX}${uid}`, payload);
  } catch (err) {
    console.warn("Failed to persist student OTP session:", err);
  }
}

/**
 * Retrieves and validates the stored OTP session token for a given student UID.
 */
export async function getStoredStudentOtpSession(
  uid: string
): Promise<{ sessionToken: string; expiresAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(`${OTP_STORAGE_PREFIX}${uid}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.sessionToken || !parsed?.expiresAt) return null;

    // Check expiration (8 hours session expiry)
    if (Date.now() >= parsed.expiresAt) {
      await clearStudentOtpSession(uid);
      return null;
    }

    return { sessionToken: parsed.sessionToken, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export async function clearStudentOtpSession(uid?: string): Promise<void> {
  try {
    if (!AsyncStorage || typeof AsyncStorage.removeItem !== "function") {
      return;
    }
    if (uid) {
      await AsyncStorage.removeItem(`${OTP_STORAGE_PREFIX}${uid}`);
    } else if (typeof AsyncStorage.getAllKeys === "function") {
      const keys = await AsyncStorage.getAllKeys();
      const otpKeys = (keys || []).filter((k) => k && k.startsWith(OTP_STORAGE_PREFIX));
      if (otpKeys.length > 0 && typeof AsyncStorage.multiRemove === "function") {
        await AsyncStorage.multiRemove(otpKeys);
      }
    }
  } catch {
    // Graceful fallback in environments without AsyncStorage
  }
}
