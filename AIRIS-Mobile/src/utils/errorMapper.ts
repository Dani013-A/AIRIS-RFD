/**
 * Safely extracts error details for developer logs without exposing sensitive credential parameters.
 */
export function sanitizeErrorForLogging(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
    };

    if (typeof candidate.code === "string") {
      return candidate.code;
    }

    if (typeof candidate.message === "string") {
      return candidate.message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

/**
 * Translate technical Firebase error codes into friendly, helpful messages that any student can understand.
 */
export function mapAuthError(error: unknown): string {
  const defaultMessage = "Authentication failed. Please try again.";
  if (!error) return defaultMessage;

  const candidate = error as { message?: unknown; code?: unknown };
  const message = typeof candidate.message === "string" ? candidate.message : String(error);
  const code = typeof candidate.code === "string" ? candidate.code : "";

  // Find the Firebase error code or search the text of the message.
  const testString = `${code} ${message}`.toLowerCase();

  if (testString.includes("only verified tip email accounts")) {
    return "Only verified TIP email accounts ending in @tip.edu.ph can be used to access AIRIS. Please choose your TIP Google account.";
  }
  if (testString.includes("auth/account-exists-with-different-credential") || testString.includes("account-exists-with-different-credential")) {
    return "An AIRIS account already exists for this TIP email using another sign-in method. Please log in using your original method first.";
  }
  if (testString.includes("auth/invalid-credential")) {
    return "Incorrect email or password.";
  }
  if (testString.includes("auth/wrong-password")) {
    return "Incorrect email or password.";
  }
  if (testString.includes("auth/user-not-found")) {
    return "Incorrect email or password.";
  }
  if (testString.includes("auth/email-already-in-use") || testString.includes("email-already-in-use")) {
    return "This TIP email is already registered.";
  }
  if (testString.includes("auth/weak-password")) {
    return "Password is too weak. Must meet all security requirements.";
  }
  if (testString.includes("auth/too-many-requests")) {
    return "Too many attempts. Please try again later.";
  }
  if (testString.includes("auth/network-request-failed") || testString.includes("network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }
  if (testString.includes("auth/user-disabled")) {
    return "This user account has been disabled.";
  }

  if (testString.includes("firestore profile already exists")) {
    return "An account conflict was detected. A profile already exists for this email address. Please contact the AIRIS administrator.";
  }

  // Default message for other Firebase database issues.
  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("FirebaseError") ||
      msg.toLowerCase().includes("permission-denied") ||
      msg.toLowerCase().includes("firestore") ||
      msg.toLowerCase().includes("unreachable")
    ) {
      return "A database configuration or connection error occurred. Please try again or contact support.";
    }
    return msg;
  }
  return defaultMessage;
}
