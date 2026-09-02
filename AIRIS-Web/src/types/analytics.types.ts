export interface DashboardMetrics {
  totalActiveUsers: number;
  totalInterviewsConducted: number;
  totalAiFeedbackGenerated: number;
  totalResumesParsed: number;
  growthPercentage: number;
  growthLabel?: string;
  growthData?: { month: string; count: number }[];
}

export interface StudentEngagement {
  activeToday: number;
  activeThisWeek: number;
  weeklyEngagementRate: number;
}

export interface SystemHealth {
  aiServiceStatus: "healthy" | "degraded" | "down" | string;
  firebaseStatus: "healthy" | "degraded" | "down" | string;
  serverStatus: "healthy" | "degraded" | "down" | string;
  lastSyncTime: string;
}

export interface PerformanceInsight {
  topPerformersCount: number;
  consistentImprovementCount: number;
  multipleResumesUploadedCount: number;
  engagement: StudentEngagement;
  averageResumesPerStudent: number;
}
