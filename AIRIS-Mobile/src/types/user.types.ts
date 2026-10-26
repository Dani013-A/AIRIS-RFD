import type { FieldValue, Timestamp } from "firebase/firestore";

export type UserRole = "student" | "admin";

export interface AppUser {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  isProfileComplete: boolean;
  createdAt?: FieldValue | Timestamp;
  updatedAt?: FieldValue | Timestamp;
  hasCompletedOnboarding: boolean;
  hasCompletedInitialSetup?: boolean;
  college?: string;
  department?: string;
  degreeProgram?: string;
  targetPosition?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  acceptedTermsAt?: FieldValue | Timestamp;
  acceptedPrivacyAt?: FieldValue | Timestamp;
  termsVersion?: string;
  privacyVersion?: string;
  hasUploadedResume?: boolean;
  hasCompletedProductTour?: boolean;
  activeResumeId?: string | null;
  resumeVersionCounter?: number;
  photoURL?: string | null;
  isDisabled?: boolean;
  isDeleted?: boolean;
  accountState?: "ACTIVE" | "DISABLED" | "DELETED";
  deletedAt?: FieldValue | Timestamp;
  deletionOrigin?: "SELF" | "ADMIN" | null;
}
