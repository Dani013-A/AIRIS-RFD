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
  degreeProgram?: string;
  targetPosition?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  acceptedTermsAt?: FieldValue | Timestamp;
  acceptedPrivacyAt?: FieldValue | Timestamp;
  termsVersion?: string;
  privacyVersion?: string;
  hasUploadedResume?: boolean;
  activeResumeId?: string | null;
  resumeVersionCounter?: number;
}
