export interface AnalyticsFilterParams {
  program?: string;
  coordinator?: string;
  period?: "all" | "7d" | "30d" | "90d" | "1y";
  status?: string;
  datasetScope?: "all" | "genuine" | "demo";
}

export interface CompletionFunnel {
  registeredCount: number;
  resumeUploadedCount: number;
  resumeAnalyzedCount: number;
  interviewStartedCount: number;
  interviewCompletedCount: number;
  fullyPreparedCount: number; // Both valid resume analysis and completed interview
  completionRate: number; // (fullyPreparedCount / registeredCount) * 100
}

export interface NeedsAttentionBreakdown {
  resumeMissingAnalysis: { count: number; studentUids: string[] };
  analysisWithoutInterview: { count: number; studentUids: string[] };
  interviewInProgress: { count: number; studentUids: string[] };
  incompleteEvaluations: { count: number; studentUids: string[] };
}

export interface DashboardMetrics {
  registeredStudentsCount: number;
  activeStudentsCount: number;
  resumeSubmissionsCount: number;
  studentsWithResumeCount: number;
  totalInterviewsConducted: number;
  totalAiFeedbackGenerated: number;
  growthData: { month: string; count: number }[];
  funnel: CompletionFunnel;
  performanceSummary: {
    avgResumeScore: number | null;
    avgInterviewScore: number | null;
    avgEmployabilityScore: number | null;
    fullyEvaluatedStudentsCount: number;
  };
  needsAttention: NeedsAttentionBreakdown;
  interviewGrowthData?: { month: string; count: number }[];
  // Deprecated aliases for backwards compatibility
  totalActiveUsers?: number;
  totalResumesParsed?: number;
}

export interface StudentEngagement {
  activeToday: number;
  activeThisWeek: number;
  weeklyEngagementRate: number;
}

export interface SystemHealth {
  aiServiceStatus: "healthy" | "degraded" | "down" | string;
  firebaseStatus: "healthy" | "degraded" | "down" | string;
  serverStatus: string;
  lastSyncTime: string;
  isRealtime: boolean;
}

export interface PerformanceInsight {
  topPerformersCount: number;
  consistentImprovementCount: number;
  multipleResumesUploadedCount: number;
  engagement: StudentEngagement;
  averageResumesPerStudent: number;
}
