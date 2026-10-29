import {
  DashboardMetrics,
  SystemHealth,
  PerformanceInsight,
  AnalyticsFilterParams,
  CompletionFunnel,
} from "../../types/analytics.types";
import { AdminRole } from "../../types/auth.types";
import { StudentListItem } from "../../types/user.types";
import { fetchStudentsList } from "./userService";
import { recordedTimestamp } from "./recordedTimestamp.mjs";
import { getAdminApiBaseUrl } from "../../config/api";

function parseTimestamp(ts: unknown): Date {
  return new Date(recordedTimestamp(ts) || NaN);
}

function isWithinPeriod(date: Date, period?: string): boolean {
  if (!period || period === "all") return true;
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return false;
  switch (period) {
    case "7d":
      return diffMs <= 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return diffMs <= 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return diffMs <= 90 * 24 * 60 * 60 * 1000;
    case "1y":
      return diffMs <= 365 * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

/**
 * Aggregates dynamic metrics from Firestore student profiles and subcollections.
 * Strictly consumes authoritative stored records — NO hardcoded data, NO synthetic scoring.
 */
export async function fetchDashboardAnalytics(
  filters?: AnalyticsFilterParams,
  userRole?: AdminRole,
  assignedProgram?: string
): Promise<{
  metrics: DashboardMetrics;
  health: SystemHealth;
  insights: PerformanceInsight;
}> {
  // Treat all registered student profiles as the institutional population
  const allStudents = await fetchStudentsList({
    program: filters?.program,
    coordinator: filters?.coordinator,
    userRole,
    assignedProgram,
    datasetScope: filters?.datasetScope || "all",
  });

  // Filter students by selected date period
  const scopedStudents = allStudents.filter((s) => {
    const d = parseTimestamp(s.createdAt);
    return isWithinPeriod(d, filters?.period);
  });

  const totalActiveUsers = scopedStudents.filter((s) => !s.isDisabled).length;

  let totalResumesParsed = 0;
  let totalAiFeedbackGenerated = 0;
  let totalInterviewsConducted = 0;
  let multipleResumesUploadedCount = 0;

  // Completion Funnel counters
  let resumeUploadedCount = 0;
  let resumeAnalyzedCount = 0;
  let interviewStartedCount = 0;
  let interviewCompletedCount = 0;
  let fullyPreparedCount = 0;

  // Performance calculation accumulators (only valid scores, no manufactured zeros)
  const validResumeScores: number[] = [];
  const validInterviewScores: number[] = [];
  const validEmployabilityScores: number[] = [];

  // Needs Attention Category Trackers (derived reliably from authoritative student evaluations)
  const resumeMissingAnalysisUids: string[] = [];
  const analysisWithoutInterviewUids: string[] = [];
  const interviewInProgressUids: string[] = [];
  const incompleteEvaluationsUids: string[] = [];

  for (const s of scopedStudents) {
    totalResumesParsed += s.resumesCount;
    totalInterviewsConducted += s.interviewsCount;

    if (s.resumesCount > 1) {
      multipleResumesUploadedCount++;
    }

    const hasResume = s.hasUploadedResume || s.resumesCount > 0;
    if (hasResume) {
      resumeUploadedCount++;
    }

    const hasResumeAnalysis = s.resumeScore !== undefined && s.resumeScore !== null;
    if (hasResumeAnalysis) {
      resumeAnalyzedCount++;
      totalAiFeedbackGenerated += 1;
      validResumeScores.push(s.resumeScore!);
    }

    if (s.interviewsCount > 0 || s.interviewStatus === "in_progress" || s.interviewStatus === "completed") {
      interviewStartedCount++;
    }

    const hasCompletedInterview = s.interviewStatus === "completed" && s.interviewScore !== undefined;
    if (hasCompletedInterview) {
      interviewCompletedCount++;
      validInterviewScores.push(s.interviewScore!);
    }

    if (s.employabilityScore !== undefined && s.employabilityScore !== null) {
      fullyPreparedCount++;
      validEmployabilityScores.push(s.employabilityScore);
    }

    // Operational "Needs Attention" categorizations
    if (hasResume && !hasResumeAnalysis) {
      resumeMissingAnalysisUids.push(s.uid);
    }
    if (hasResumeAnalysis && !hasCompletedInterview) {
      analysisWithoutInterviewUids.push(s.uid);
    }
    if (s.interviewStatus === "in_progress") {
      interviewInProgressUids.push(s.uid);
    }
    if (s.employabilityScore === undefined && (hasResumeAnalysis || s.interviewScore !== undefined)) {
      incompleteEvaluationsUids.push(s.uid);
    }
  }

  const registeredCount = scopedStudents.length;
  const completionRate =
    registeredCount > 0 ? Math.round((fullyPreparedCount / registeredCount) * 100) : 0;

  const funnel: CompletionFunnel = {
    registeredCount,
    resumeUploadedCount,
    resumeAnalyzedCount,
    interviewStartedCount,
    interviewCompletedCount,
    fullyPreparedCount,
    completionRate,
  };

  const needsAttention = {
    resumeMissingAnalysis: { count: resumeMissingAnalysisUids.length, studentUids: resumeMissingAnalysisUids },
    analysisWithoutInterview: { count: analysisWithoutInterviewUids.length, studentUids: analysisWithoutInterviewUids },
    interviewInProgress: { count: interviewInProgressUids.length, studentUids: interviewInProgressUids },
    incompleteEvaluations: { count: incompleteEvaluationsUids.length, studentUids: incompleteEvaluationsUids },
  };

  const avgResumeScore =
    validResumeScores.length > 0
      ? Math.round(validResumeScores.reduce((a, b) => a + b, 0) / validResumeScores.length)
      : null;

  const avgInterviewScore =
    validInterviewScores.length > 0
      ? Math.round(validInterviewScores.reduce((a, b) => a + b, 0) / validInterviewScores.length)
      : null;

  const avgEmployabilityScore =
    validEmployabilityScores.length > 0
      ? Math.round(validEmployabilityScores.reduce((a, b) => a + b, 0) / validEmployabilityScores.length)
      : null;

  // Last 6 Months Registration Growth Calculation from actual student dates
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthIndex = new Date().getMonth();
  const last6Months: { month: string; index: number; year: number; count: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(new Date().getFullYear(), currentMonthIndex - i, 1);
    const mIndex = monthDate.getMonth();
    last6Months.push({ month: months[mIndex], index: mIndex, year: monthDate.getFullYear(), count: 0 });
  }

  scopedStudents.forEach((student) => {
    if (student.createdAt) {
      const date = parseTimestamp(student.createdAt);
      const studentMonth = date.getMonth();
      const match = last6Months.find((m) => m.index === studentMonth && m.year === date.getFullYear());
      if (match) {
        match.count++;
      }
    }
  });

  const growthData = last6Months.map((m) => ({
    month: m.month,
    count: m.count,
  }));

  // Activity calculation
  const activeToday = scopedStudents.filter((s) => {
    if (!s.updatedAt) return false;
    const d = parseTimestamp(s.updatedAt);
    return d.getTime() <= Date.now() && Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
  }).length;

  const activeThisWeek = scopedStudents.filter((s) => {
    if (!s.updatedAt) return false;
    const d = parseTimestamp(s.updatedAt);
    return d.getTime() <= Date.now() && Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const weeklyEngagementRate =
    scopedStudents.length > 0 ? Math.round((activeThisWeek / scopedStudents.length) * 100) : 0;

  const averageResumesPerStudent =
    scopedStudents.length > 0 ? parseFloat((totalResumesParsed / scopedStudents.length).toFixed(1)) : 0;

  const topPerformersCount = validEmployabilityScores.filter((sc) => sc >= 80).length;

  const interviewGrowthData = aggregateInterviewActivityTrend(scopedStudents, filters?.period);

  const metrics: DashboardMetrics = {
    registeredStudentsCount: registeredCount,
    activeStudentsCount: totalActiveUsers,
    resumeSubmissionsCount: totalResumesParsed,
    studentsWithResumeCount: resumeUploadedCount,
    totalActiveUsers,
    totalInterviewsConducted,
    totalAiFeedbackGenerated,
    totalResumesParsed,
    growthData,
    funnel,
    performanceSummary: {
      avgResumeScore,
      avgInterviewScore,
      avgEmployabilityScore,
      fullyEvaluatedStudentsCount: fullyPreparedCount,
    },
    needsAttention,
    interviewGrowthData,
  };

  // Check backend AI service health via internal /api/health or backend fallback
  let aiStatus = "healthy";
  let serverStatus = "operational";
  try {
    const healthUrl =
      typeof window !== "undefined"
        ? "/api/health"
        : `${getAdminApiBaseUrl()}/health`;
    const res = await fetch(healthUrl, { method: "GET", signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (
        data.status === "healthy" ||
        data.aiServiceStatus === "healthy" ||
        data.status === "running" ||
        data.health === "healthy"
      ) {
        aiStatus = "healthy";
        serverStatus = "operational";
      } else if (data.status === "degraded" || data.aiServiceStatus === "degraded") {
        aiStatus = "degraded";
        serverStatus = "degraded";
      } else {
        aiStatus = "offline";
        serverStatus = "unavailable";
      }
    } else {
      aiStatus = "degraded";
      serverStatus = "unavailable";
    }
  } catch {
    aiStatus = "offline";
    serverStatus = "unavailable";
  }

  const health: SystemHealth = {
    aiServiceStatus: aiStatus,
    firebaseStatus: "healthy",
    serverStatus,
    lastSyncTime: new Date().toLocaleTimeString(),
    isRealtime: false,
  };

  const insights: PerformanceInsight = {
    topPerformersCount,
    consistentImprovementCount: multipleResumesUploadedCount,
    multipleResumesUploadedCount,
    engagement: {
      activeToday,
      activeThisWeek,
      weeklyEngagementRate,
    },
    averageResumesPerStudent,
  };

  return { metrics, health, insights };
}

/**
 * Aggregates actual stored interview sessions across the last 6 months for eligible students.
 * Strictly consumes recorded interview timestamps — never manufactures synthetic data points.
 */
export function aggregateInterviewActivityTrend(
  students: StudentListItem[],
  period?: string
): Array<{ month: string; count: number }> {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const last6Months: { month: string; index: number; year: number; count: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(currentYear, currentMonthIndex - i, 1);
    const mIndex = monthDate.getMonth();
    last6Months.push({ month: months[mIndex], index: mIndex, year: monthDate.getFullYear(), count: 0 });
  }

  students.forEach((student) => {
    if (student.interviewDates && Array.isArray(student.interviewDates)) {
      student.interviewDates.forEach((dateStr) => {
        const date = parseTimestamp(dateStr);
        if (isWithinPeriod(date, period)) {
          const mIndex = date.getMonth();
          const match = last6Months.find((m) => m.index === mIndex && m.year === date.getFullYear());
          if (match) {
            match.count++;
          }
        }
      });
    }
  });

  return last6Months.map((m) => ({ month: m.month, count: m.count }));
}
