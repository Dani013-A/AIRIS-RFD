import {
  mapAuthError,
  MSG_INVALID_CREDENTIAL,
  MSG_EMAIL_ALREADY_IN_USE,
  MSG_ACCOUNT_PAUSED,
  MSG_ACCOUNT_REMOVED,
  MSG_MISSING_PROFILE,
  sanitizeErrorForLogging,
} from "./errorMapper";

describe("Error Normalization Architecture & Security Boundary", () => {
  describe("Authentication Credential Errors & Guidance", () => {
    it("should map auth/invalid-credential to guidance with Google sign-in hint", () => {
      const result = mapAuthError({ code: "auth/invalid-credential", message: "INVALID_LOGIN_CREDENTIALS" });
      expect(result).toBe(MSG_INVALID_CREDENTIAL);
      expect(result).toContain("Google");
    });

    it("should map auth/wrong-password to clear password guidance with Google sign-in guidance", () => {
      const result = mapAuthError({ code: "auth/wrong-password", message: "Wrong password" });
      expect(result).toBe(MSG_INVALID_CREDENTIAL);
      expect(result).toContain("Google");
    });

    it("should map auth/user-not-found to actionable account-not-found message with sign-up", () => {
      const result = mapAuthError({ code: "auth/user-not-found", message: "User not found" });
      expect(result).toBe("No AIRIS account found with this email. Please sign up to continue.");
      expect(result).toContain("sign up");
    });
  });

  describe("Cross-Provider Conflict Guidance", () => {
    it("should map auth/email-already-in-use to guide toward existing sign-in method", () => {
      const result = mapAuthError({ code: "auth/email-already-in-use", message: "Email in use" });
      expect(result).toBe(MSG_EMAIL_ALREADY_IN_USE);
      expect(result).toContain("use Google Sign-In");
    });

    it("should map auth/account-exists-with-different-credential cleanly", () => {
      const result = mapAuthError({
        code: "auth/account-exists-with-different-credential",
        message: "Account exists with different credential",
      });
      expect(result).toContain("already exists for this TIP email using another sign-in method");
    });
  });

  describe("Account Lifecycle Error Mapping", () => {
    it("should map auth/user-disabled to administrator paused guidance", () => {
      const result = mapAuthError({ code: "auth/user-disabled", message: "User disabled" });
      expect(result).toBe(MSG_ACCOUNT_PAUSED);
      expect(result).toBe("Your account has been paused by an administrator. Please contact your department for assistance.");
    });

    it("should map explicit paused account error string", () => {
      const result = mapAuthError(new Error("Your account has been paused by an administrator. Please contact your department for assistance."));
      expect(result).toBe(MSG_ACCOUNT_PAUSED);
    });

    it("should map legacy lowercase suspension message", () => {
      const result = mapAuthError(new Error("your account has been paused or deleted by the admin"));
      expect(result).toBe(MSG_ACCOUNT_PAUSED);
    });

    it("should map account removed error string", () => {
      const result = mapAuthError(new Error("This account has been removed. Please contact the administrator if you believe this is an error."));
      expect(result).toBe(MSG_ACCOUNT_REMOVED);
    });

    it("should map missing profile error string", () => {
      const result = mapAuthError(new Error("Account profile not found. If your registration was interrupted or your account was modified, please contact your department administrator or support to initialize your profile."));
      expect(result).toBe(MSG_MISSING_PROFILE);
    });
  });

  describe("Network and System Security Sanitization", () => {
    it("should map auth/network-request-failed to clear network error", () => {
      const result = mapAuthError({ code: "auth/network-request-failed", message: "Network error" });
      expect(result).toContain("Network error. Please check your internet connection.");
    });

    it("should sanitize and mask raw Firestore/database errors", () => {
      const rawDbError = new Error("FirebaseError: [code=permission-denied]: Missing or insufficient permissions at /users/secret_uid");
      const result = mapAuthError(rawDbError);
      expect(result).toBe("We couldn't finish setting up your account. Please try again.");
      expect(result).not.toContain("secret_uid");
      expect(result).not.toContain("FirebaseError");
    });

    it("should sanitize logging errors without exposing sensitive parameters", () => {
      const logged = sanitizeErrorForLogging(new Error("Error with key=AIzaSySecretApiKey"));
      expect(logged).toContain("AIzaSySecretApiKey");
    });
  });
});
