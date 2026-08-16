export interface AppUser {
  uid: string;
  email: string;
  fullName: string;
  role: "student" | "admin";
  college?: string;
  degreeProgram?: string;
  targetPosition?: string;
  activeResumeId?: string;
  resumeVersionCounter?: number;
  hasUploadedResume?: boolean;
  isProfileComplete?: boolean;
  createdAt: any;
  updatedAt: any;
  hasCompletedOnboarding?: boolean;
  hasCompletedInitialSetup?: boolean;
  isDisabled?: boolean;
}

export interface StudentListItem extends AppUser {
  employabilityScore?: number;
  resumeStatus?: "missing" | "success" | "analyzing" | "failed";
  interviewStatus?: "not_started" | "completed";
}
