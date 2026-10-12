export interface AppUser {
  uid: string;
  email: string;
  fullName: string;
  role: "student" | "admin" | "career_center" | "ojt_coordinator";
  college?: string;
  degreeProgram?: string;
  targetPosition?: string;
  coordinator?: string;
  activeResumeId?: string;
  resumeVersionCounter?: number;
  hasUploadedResume?: boolean;
  isProfileComplete?: boolean;
  createdAt: any;
  updatedAt: any;
  hasCompletedOnboarding?: boolean;
  hasCompletedInitialSetup?: boolean;
  isDisabled?: boolean;
  isDefenseDemo?: boolean;
  isSyntheticUat?: boolean;
}

export type EmployabilityStatus =
  | "not_started"
  | "resume_pending"
  | "interview_pending"
  | "completed";

export interface StudentListItem extends AppUser {
  employabilityScore?: number;
  employabilityStatus: EmployabilityStatus;
  resumeScore?: number;
  interviewScore?: number;
  resumeStatus: "missing" | "analyzing" | "success" | "failed";
  interviewStatus: "not_started" | "in_progress" | "completed";
  resumesCount: number;
  interviewsCount: number;
  lastActivityDate?: string;
}

export interface AlignmentComponentBreakdown {
  rawScore: number;
  weight: number;
  weightedScore: number;
  label: string;
}

export interface StoredResumeAnalysis {
  analysisId?: string;
  atsScore?: {
    overallScore?: number;
    level?: string;
    levelLabel?: string;
    breakdown?: Record<string, any>;
  };
  alignmentScore?: {
    overallScore?: number;
    targetPosition?: string;
    breakdown?: {
      skillsMatch?: AlignmentComponentBreakdown;
      experienceProjects?: AlignmentComponentBreakdown;
      educationRelevance?: AlignmentComponentBreakdown;
      certifications?: AlignmentComponentBreakdown;
    };
    competencies?: Array<{
      name: string;
      status: string;
      isRequired: boolean;
      score?: number;
    }>;
    alignmentSummary?: string;
  };
  resumeScore?: {
    overallScore?: number;
    level?: string;
    atsContribution?: number;
    alignmentContribution?: number;
    formula?: string;
  };
  overallScore?: number;
  detectedSkills?: Array<string | Record<string, any>>;
  suggestions?: Array<string | Record<string, any>>;
  analyzedAt?: string;
  scoringModelVersion?: string;
}

export interface StoredInterviewSession {
  sessionId: string;
  targetRole: string;
  program: string;
  interviewType: string;
  startedAt: number;
  completedAt?: number;
  totalQuestions: number;
  overallScore?: number;
  finalReport?: {
    overallPerformance?: number;
    categoryBreakdown?: {
      SemanticCorrectness?: number;
      AIHolisticEvaluation?: number;
      CommunicationClarity?: number;
    };
    metrics?: {
      semanticCorrectness?: number;
      aiHolisticEvaluation?: number;
      communicationClarity?: number;
    };
    strengths?: string[];
    areasToImprove?: string[];
    weakestAnswer?: {
      question?: string;
      whyItWasWeak?: string;
      howToImprove?: string;
      betterResponseStructure?: string;
    };
    recommendedPractice?: string[];
  };
}

export interface ScoreHistoryEvent {
  id: string;
  type: "resume" | "interview" | "employability";
  title: string;
  version?: number;
  score: number;
  previousScore?: number;
  delta?: number;
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
  latestResumeAnalysis: StoredResumeAnalysis | null;
  latestResume: any | null;
  latestInterview: StoredInterviewSession | null;
  scoreHistory: ScoreHistoryEvent[];
  activityLogs: StudentActivityEvent[];
  resumesList: any[];
  interviewsList: StoredInterviewSession[];
}
