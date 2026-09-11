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

  const testString = `${code} ${message}`.toLowerCase();

  if (testString.includes("only verified tip email accounts")) {
    return "Only verified TIP email accounts ending in @tip.edu.ph can be used to access AIRIS. Please choose your TIP Google account.";
  }
  if (testString.includes("auth/account-exists-with-different-credential") || testString.includes("account-exists-with-different-credential")) {
    return "An AIRIS account already exists for this TIP email using another sign-in method. Please log in using your original method first.";
  }
  if (testString.includes("auth/requires-recent-login") || testString.includes("requires-recent-login") || testString.includes("recent login")) {
    return "Please verify your current password before deleting your account.";
  }
  if (testString.includes("auth/user-not-found")) {
    return "No account found with this email. Please check your email address or sign up to create a new account.";
  }
  if (testString.includes("auth/invalid-credential") || testString.includes("auth/wrong-password")) {
    return "No account found with this email, or the password entered is incorrect. Please check your credentials or sign up.";
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
  if (testString.includes("your account has been paused or deleted by the admin")) {
    return "your account has been paused or deleted by the admin";
  }
  if (testString.includes("auth/user-disabled") || testString.includes("user-disabled")) {
    return "your account has been paused or deleted by the admin";
  }

  if (testString.includes("firestore profile already exists")) {
    return "An account conflict was detected. A profile already exists for this email address. Please contact the AIRIS administrator.";
  }

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

export interface NormalizedApiError {
  userMessage: string;
  statusCode?: number;
  code?: string;
}

/**
 * App-wide Centralized API Error Normalization Boundary.
 * Sanitizes 2xx malformed data, 3xx, 4xx, 5xx, network, and timeout errors into clean, actionable user guidance.
 * NEVER leaks raw technical strings (AxiosError, HTTP 500, FirebaseError, TypeError, stack traces, JSON blobs) to the UI.
 */
export function normalizeApiError(error: unknown, defaultFallbackMsg: string = "Unable to complete request. Please try again."): NormalizedApiError {
  if (!error) {
    return { userMessage: defaultFallbackMsg };
  }

  const rawLog = sanitizeErrorForLogging(error);
  console.log("[Centralized API Error Log]:", rawLog);

  let status: number | undefined = undefined;
  let rawMsg = "";
  let code: string | undefined = undefined;

  if (typeof error === "object" && error !== null) {
    const errObj = error as any;
    status = errObj.status || errObj.statusCode || errObj.response?.status;
    rawMsg = errObj.message || errObj.detail || errObj.response?.data?.detail || String(error);
    code = errObj.code || errObj.response?.data?.code;
  } else if (typeof error === "string") {
    rawMsg = error;
  }

  const str = `${rawMsg} ${code || ""}`.toLowerCase();

  // Page limit specifically returned from backend
  if (str.includes("exceeded_page_limit") || str.includes("pages long") || str.includes("page limit")) {
    return {
      userMessage: rawMsg.includes("pages long") ? rawMsg : "Your resume exceeds the 3-page maximum limit. Please upload a resume with 3 pages or fewer.",
      statusCode: 400,
      code: "EXCEEDED_PAGE_LIMIT",
    };
  }

  // Non-resume file rejection
  if (
    str.includes("does not appear to be a valid resume") ||
    str.includes("invalid resume") ||
    str.includes("doesn't appear to be a resume") ||
    str.includes("resume or cv") ||
    code === "INVALID_RESUME"
  ) {
    return {
      userMessage: rawMsg && (rawMsg.includes("doesn't appear to be a resume") || rawMsg.includes("valid resume"))
        ? rawMsg
        : "This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information.",
      statusCode: 400,
      code: "INVALID_RESUME",
    };
  }

  // Firebase Storage Error Code Mapping
  if (str.includes("storage/unknown") || str.includes("storage/object-not-found") || str.includes("storage/bucket-not-found") || str.includes("bucket not found")) {
    return {
      userMessage: "Profile photos are temporarily unavailable. Please try again later.",
      statusCode: 404,
      code: "STORAGE_UNAVAILABLE",
    };
  }

  if (str.includes("storage/unauthorized")) {
    return {
      userMessage: "You don't have permission to update your profile photo.",
      statusCode: 403,
      code: "STORAGE_UNAUTHORIZED",
    };
  }

  if (str.includes("storage/unauthenticated")) {
    return {
      userMessage: "Your session has expired. Please sign in again.",
      statusCode: 401,
      code: "STORAGE_UNAUTHENTICATED",
    };
  }

  if (str.includes("storage/retry-limit-exceeded") || str.includes("storage/canceled")) {
    return {
      userMessage: "Unable to upload your photo. Please check your connection and try again.",
      statusCode: 408,
      code: "STORAGE_RETRY_EXCEEDED",
    };
  }

  if (str.includes("storage/invalid-checksum") || str.includes("cannot-slice-blob")) {
    return {
      userMessage: "That image couldn't be used. Please choose another photo.",
      statusCode: 400,
      code: "STORAGE_INVALID_IMAGE",
    };
  }

  // Network or timeout failure
  if (str.includes("network") || str.includes("failed to fetch") || str.includes("connection error") || str.includes("econnrefused")) {
    return {
      userMessage: "Network connection error. Please check your internet connection and try again.",
      statusCode: 0,
      code: "NETWORK_ERROR",
    };
  }

  if (str.includes("timeout") || str.includes("timed out")) {
    return {
      userMessage: "The request timed out. Please try again.",
      statusCode: 408,
      code: "TIMEOUT",
    };
  }

  // 4xx status codes
  if (status === 400) {
    return { userMessage: rawMsg && !rawMsg.includes("HTTP") ? rawMsg : "Invalid request parameters. Please verify your input and try again.", statusCode: 400 };
  }
  if (status === 401) {
    return { userMessage: "Your session has expired. Please sign in again.", statusCode: 401 };
  }
  if (status === 403) {
    return { userMessage: "Access restricted. You do not have permission to perform this action.", statusCode: 403 };
  }
  if (status === 404) {
    return { userMessage: "The requested resource could not be found. Please try again.", statusCode: 404 };
  }
  if (status === 413) {
    return { userMessage: "File size is too large. Please select a smaller document.", statusCode: 413 };
  }
  if (status === 429) {
    return { userMessage: "Too many requests. Please wait a moment before trying again.", statusCode: 429 };
  }

  // 5xx status codes
  if (status && status >= 500) {
    return { userMessage: "Service temporarily unavailable. Please try again in a few moments.", statusCode: status };
  }

  // Sanitize any accidental technical strings
  if (
    str.includes("axioserror") ||
    str.includes("firebaseerror") ||
    str.includes("typeerror") ||
    str.includes("syntaxerror") ||
    str.includes("http error") ||
    str.includes("500") ||
    str.includes("404")
  ) {
    return { userMessage: defaultFallbackMsg };
  }

  return { userMessage: rawMsg && rawMsg.length < 120 && !str.includes("{") ? rawMsg : defaultFallbackMsg, statusCode: status };
}
