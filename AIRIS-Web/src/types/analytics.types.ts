export interface DashboardMetrics {
  totalActiveUsers: number;
  totalInterviewsConducted: number;
  totalAiFeedbackGenerated: number;
  totalResumesParsed: number;
  growthPercentage: number;
  growthData?: { month: string; count: number }[];
}

export interface StudentEngagement {
  activeToday: number;
  activeThisWeek: number;
  weeklyEngagementRate: number;
}

export interface SystemHealth {
  aiServiceStatus: "healthy" | "degraded" | "down";
  firebaseStatus: "healthy" | "degraded" | "down";
  serverStatus: "healthy" | "degraded" | "down";
  lastSyncTime: string;
}

export interface PerformanceInsight {
  topPerformersCount: number;
  consistentImprovementCount: number;
  engagement: StudentEngagement;
  averageResumesPerStudent: number;
}
