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
  resumeScore?: number;
  interviewScore?: number;
  resumeStatus?: "missing" | "success" | "analyzing" | "failed";
  interviewStatus?: "not_started" | "completed" | "in_progress";
  resumesCount?: number;
  interviewsCount?: number;
  lastActivityDate?: string;
}

export interface ScoreHistoryEvent {
  id: string;
  type: "resume" | "interview" | "employability";
  title: string;
  version?: number;
  score: number;
  previousScore?: number;
  delta?: number; // Calculated ONLY within the same metric
  date: string;
  targetPosition?: string;
  details?: string;
}

export interface StudentActivityEvent {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  type?: string;
}

export interface StudentFullProfile {
  student: StudentListItem;
  latestResumeAnalysis: any | null;
  latestResume: any | null;
  latestInterview: any | null;
  scoreHistory: ScoreHistoryEvent[];
  activityLogs: StudentActivityEvent[];
  resumesList: any[];
  interviewsList: any[];
}
