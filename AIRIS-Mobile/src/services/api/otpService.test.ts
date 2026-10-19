const memoryStore: Record<string, string> = {};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => memoryStore[key] || null),
  setItem: jest.fn(async (key: string, value: string) => {
    memoryStore[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete memoryStore[key];
  }),
  getAllKeys: jest.fn(async () => Object.keys(memoryStore)),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => delete memoryStore[k]);
  }),
  clear: jest.fn(async () => {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  }),
}));

import {
  getOtpBaseUrl,
  sendStudentOtp,
  verifyStudentOtp,
  storeStudentOtpSession,
  getStoredStudentOtpSession,
  clearStudentOtpSession,
  PRODUCTION_WEB_URL,
} from "./otpService";

describe("Student OTP Service Automated Verification Suite", () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  });

  afterAll(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  describe("1. Endpoint Selection & URL Resolution", () => {
    it("resolves to static EXPO_PUBLIC_ADMIN_URL configured in environment", () => {
      const url = getOtpBaseUrl();
      expect(url).toBe("https://admin.18-143-33-249.sslip.io");
    });

    it("falls back to PRODUCTION_WEB_URL when EXPO_PUBLIC_ADMIN_URL is empty", () => {
      expect(PRODUCTION_WEB_URL).toBe("https://admin.18-143-33-249.sslip.io");
      expect(getOtpBaseUrl()).toBe(PRODUCTION_WEB_URL);
    });

    it("never defaults to localhost or 127.0.0.1 in standard builds", () => {
      const url = getOtpBaseUrl();
      expect(url).not.toContain("localhost");
      expect(url).not.toContain("127.0.0.1");
      expect(url.startsWith("https://")).toBe(true);
    });
  });

  describe("2. Request Construction & Headers", () => {
    it("constructs correct POST request with Bearer authorization and JSON payload for sendStudentOtp", async () => {
      process.env.EXPO_PUBLIC_ADMIN_URL = "https://admin.18-143-33-249.sslip.io";
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          maskedEmail: "m****a@tip.edu.ph",
          cooldownSeconds: 60,
          expiresAt: Date.now() + 300000,
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const result = await sendStudentOtp("sample_jwt_token_123");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe("https://admin.18-143-33-249.sslip.io/api/auth/otp/send");
      expect(calledOptions.method).toBe("POST");
      expect(calledOptions.headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer sample_jwt_token_123",
      });
      expect(JSON.parse(calledOptions.body)).toEqual({ idToken: "sample_jwt_token_123" });
      expect(result.success).toBe(true);
      expect(result.maskedEmail).toBe("m****a@tip.edu.ph");
      expect(result.cooldownSeconds).toBe(60);
    });

    it("constructs correct POST request with code trimming for verifyStudentOtp", async () => {
      process.env.EXPO_PUBLIC_ADMIN_URL = "https://admin.18-143-33-249.sslip.io";
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: "Verification successful.",
          sessionToken: "signed_session_token_xyz",
          user: { uid: "tip_student_uid", email: "mdaespela@tip.edu.ph", role: "student" },
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const result = await verifyStudentOtp("sample_jwt_token_123", " 842109 ");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe("https://admin.18-143-33-249.sslip.io/api/auth/otp/verify");
      expect(JSON.parse(calledOptions.body)).toEqual({
        idToken: "sample_jwt_token_123",
        code: "842109",
      });
      expect(result.success).toBe(true);
      expect(result.sessionToken).toBe("signed_session_token_xyz");
      expect(result.user?.email).toBe("mdaespela@tip.edu.ph");
    });
  });

  describe("3. Error Mapping & Rate Limit Handling", () => {
    it("handles rate limiting cooldown (HTTP 429) correctly", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: "Please wait 45 seconds before requesting a new verification code.",
          cooldownRemaining: 45,
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const result = await sendStudentOtp("jwt_token");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Please wait 45 seconds before requesting a new verification code.");
      expect(result.cooldownRemaining).toBe(45);
    });

    it("handles invalid code with remaining attempts (HTTP 400)", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Invalid verification code. 4 attempts remaining.",
          code: "INVALID_OTP",
          remainingAttempts: 4,
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const result = await verifyStudentOtp("jwt_token", "000000");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid verification code. 4 attempts remaining.");
      expect(result.remainingAttempts).toBe(4);
      expect(result.code).toBe("INVALID_OTP");
    });

    it("gracefully catches network failure and reports sanitized context", async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error("Failed to connect to host"));
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const result = await sendStudentOtp("jwt_token");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error reaching verification service");
      expect(result.error).toContain("Failed to connect to host");
    });
  });

  describe("4. Session Persistence & Lifecycle Safety", () => {
    it("stores and retrieves active student session token", async () => {
      const studentUid = "test_student_uid_101";
      const token = "verified_session_token_abc";
      const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours

      await storeStudentOtpSession(studentUid, token, expiresAt);
      const session = await getStoredStudentOtpSession(studentUid);

      expect(session).not.toBeNull();
      expect(session?.sessionToken).toBe(token);
      expect(session?.expiresAt).toBe(expiresAt);
    });

    it("clears and returns null for expired session tokens", async () => {
      const studentUid = "test_student_uid_102";
      const token = "stale_session_token";
      const expiredTime = Date.now() - 1000; // 1 second ago

      await storeStudentOtpSession(studentUid, token, expiredTime);
      const session = await getStoredStudentOtpSession(studentUid);

      expect(session).toBeNull();
    });

    it("clears session token cleanly on explicit sign out", async () => {
      const studentUid = "test_student_uid_103";
      await storeStudentOtpSession(studentUid, "token", Date.now() + 10000);
      await clearStudentOtpSession(studentUid);

      const session = await getStoredStudentOtpSession(studentUid);
      expect(session).toBeNull();
    });
  });
});
