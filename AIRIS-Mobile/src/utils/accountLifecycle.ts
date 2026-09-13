import type { AppUser } from "../types/user.types";

export type AccountLifecycleState =
  | "ACTIVE"
  | "DISABLED_PAUSED"
  | "DELETED_REMOVED"
  | "MISSING_PROFILE";

export const ACCOUNT_PAUSED_MSG =
  "Your account has been paused by an administrator. Please contact your department for assistance.";

export const ACCOUNT_REMOVED_MSG =
  "This account has been removed. Please contact the administrator if you believe this is an error.";

export const ACCOUNT_MISSING_PROFILE_MSG =
  "Account profile not found. If your registration was interrupted or your account was modified, please contact your department administrator or support to initialize your profile.";

/**
 * Deterministic account state precedence:
 * Precedence 1: DELETED/REMOVED (isDeleted === true || accountState === 'DELETED')
 * Precedence 2: DISABLED/PAUSED (isDisabled === true || accountState === 'DISABLED')
 * Precedence 3: ACTIVE (document exists, not deleted, not disabled)
 * A missing users/{uid} document is strictly MISSING_PROFILE (never automatically DELETED and never automatically DISABLED).
 */
export function determineAccountLifecycleState(
  docExists: boolean,
  userData: Partial<AppUser> | null | undefined
): AccountLifecycleState {
  if (!docExists || !userData) {
    return "MISSING_PROFILE";
  }

  // Precedence 1: DELETED/REMOVED
  if (userData.isDeleted === true || userData.accountState === "DELETED") {
    return "DELETED_REMOVED";
  }

  // Precedence 2: DISABLED/PAUSED
  if (userData.isDisabled === true || userData.accountState === "DISABLED") {
    return "DISABLED_PAUSED";
  }

  // Precedence 3: ACTIVE
  return "ACTIVE";
}
