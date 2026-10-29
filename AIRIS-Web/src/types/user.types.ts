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
  createdAt: string;
  updatedAt: string;
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
  interviewDates?: string[];
}

export interface AlignmentComponentBreakdown {
  rawScore: number;
  weight: number;
  weightedScore: number;
  label: string;
}

export interface StoredResumeAnalysis {
  id?: string;
  analysisId?: string;
  createdAt?: unknown;
  version?: number;
  targetPosition?: string;
  result?: StoredResumeAnalysis;
  atsScore?: {
    overallScore?: number;
    level?: string;
    levelLabel?: string;
    breakdown?: Record<string, unknown>;
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
  detectedSkills?: Array<string | { name?: string; skill?: string; [field: string]: unknown }>;
  suggestions?: Array<string | { id?: string; section?: string; title?: string; action?: string; priority?: string; why?: string; reason?: string; example?: string; [field: string]: unknown }>;
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
  score?: number;
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
    strengths?: Array<string | { strength?: string; title?: string; description?: string }>;
    areasToImprove?: Array<string | { area?: string; title?: string; description?: string; weakness?: string }>;
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
  latestResume: Record<string, unknown> | null;
  latestInterview: StoredInterviewSession | null;
  scoreHistory: ScoreHistoryEvent[];
  activityLogs: StudentActivityEvent[];
  resumesList: Array<Record<string, unknown>>;
  interviewsList: StoredInterviewSession[];
}
