import { fetchStudentsList, fetchStudentDetails } from "./userService";
import { fetchAuditLogs, logAuditEvent } from "./auditService";
import { fetchDashboardAnalytics } from "./analyticsService";

/**
 * Utility to trigger browser file download for generated CSV strings.
 */
export function triggerFileDownload(content: string, fileName: string, mimeType = "text/csv") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. STUDENT PROFILES & PERFORMANCE SNAPSHOT
 */
export async function downloadStudentsReport(adminName: string): Promise<void> {
  const students = await fetchStudentsList();

  const headers = [
    "User ID",
    "Student Name",
    "TIP Email",
    "College",
    "Degree Program",
    "Target Position",
    "Date Registered",
    "Employability Score",
    "Resume ATS Score",
    "Interview Score",
    "Resumes Uploaded",
    "Interviews Taken",
    "Resume Status",
    "Interview Status",
    "Account Status",
    "Last Activity",
  ];

  const rows = students.map((s) => [
    s.uid,
    `"${s.fullName.replace(/"/g, '""')}"`,
    s.email,
    `"${(s.college || "").replace(/"/g, '""')}"`,
    `"${(s.degreeProgram || "").replace(/"/g, '""')}"`,
    `"${(s.targetPosition || "").replace(/"/g, '""')}"`,
    s.createdAt,
    s.employabilityScore ?? 0,
    s.resumeScore ?? 0,
    s.interviewScore ?? 0,
    s.resumesCount ?? 0,
    s.interviewsCount ?? 0,
    s.resumeStatus,
    s.interviewStatus,
    s.isDisabled ? "Disabled" : "Active",
    s.lastActivityDate || s.updatedAt,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerFileDownload(csvContent, `AIRIS_Student_Profiles_Performance_${Date.now()}.csv`);

  await logAuditEvent("ReportsGenerated", "Downloaded Student Profiles & Performance CSV Report", adminName);
}

/**
 * 2. STUDENT PERFORMANCE IMPROVEMENT HISTORY (Itemized timeline per evaluation)
 */
export async function downloadPerformanceHistoryReport(adminName: string): Promise<void> {
  const students = await fetchStudentsList();
  const rows: any[][] = [];

  const headers = [
    "User ID",
    "Student Name",
    "Degree Program",
    "Target Position",
    "Evaluation Type",
    "Version / Session",
    "Score",
    "Score Delta (Within Metric)",
    "Evaluation Date",
    "Evaluation Details",
  ];

  for (const s of students) {
    try {
      const fullProfile = await fetchStudentDetails(s.uid);
      for (const ev of fullProfile.scoreHistory) {
        rows.push([
          s.uid,
          `"${s.fullName.replace(/"/g, '""')}"`,
          `"${(s.degreeProgram || "").replace(/"/g, '""')}"`,
          `"${(ev.targetPosition || s.targetPosition || "").replace(/"/g, '""')}"`,
          ev.type.toUpperCase(),
          ev.version ? `v${ev.version}` : "N/A",
          ev.score,
          ev.delta !== undefined ? (ev.delta > 0 ? `+${ev.delta}` : `${ev.delta}`) : "Baseline",
          ev.date,
          `"${(ev.details || "").replace(/"/g, '""')}"`,
        ]);
      }
    } catch (e) {
      console.warn("Failed to fetch history for report:", s.uid, e);
    }
  }

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerFileDownload(csvContent, `AIRIS_Performance_History_Timeline_${Date.now()}.csv`);

  await logAuditEvent("ReportsGenerated", "Downloaded Student Performance Improvement History CSV Report", adminName);
}

/**
 * 3. INTERVIEW USAGE & PARTICIPATION METRICS
 */
export async function downloadInterviewUsageReport(adminName: string): Promise<void> {
  const { metrics } = await fetchDashboardAnalytics();
  const students = await fetchStudentsList();

  const studentsWithInterviews = students.filter((s) => (s.interviewsCount ?? 0) > 0);
  const totalInterviews = metrics.totalInterviewsConducted;
  const participationRate = students.length > 0 ? ((studentsWithInterviews.length / students.length) * 100).toFixed(1) : "0.0";

  const headers = [
    "Metric Name",
    "Recorded Value",
    "Notes",
  ];

  const rows = [
    ["Reporting Period", new Date().toISOString(), "Current snapshot"],
    ["Total Registered Students", students.length, "Total student accounts"],
    ["Students Participating in Interviews", studentsWithInterviews.length, "Students with at least 1 interview session"],
    ["Interview Participation Rate", `${participationRate}%`, "Percentage of total registered students"],
    ["Total Mock Interviews Completed", totalInterviews, "Verified Firestore interview sessions"],
    ["Total AI Feedback Results Generated", metrics.totalAiFeedbackGenerated, "Verified resume analysis evaluations"],
    ["Total Resumes Parsed", metrics.totalResumesParsed, "Verified resume documents"],
  ];

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerFileDownload(csvContent, `AIRIS_Interview_Usage_Metrics_${Date.now()}.csv`);

  await logAuditEvent("ReportsGenerated", "Downloaded Interview Usage & Participation CSV Report", adminName);
}

/**
 * 4. SYSTEM & OPERATIONAL HEALTH REPORT (Truthful metrics only)
 */
export async function downloadSystemHealthReport(adminName: string): Promise<void> {
  const { metrics, health } = await fetchDashboardAnalytics();

  const headers = ["System Indicator", "Recorded Status", "Operational Context"];

  const rows = [
    ["Audit Timestamp", new Date().toISOString(), "System telemetry query time"],
    ["Firebase Database Status", health.firebaseStatus.toUpperCase(), "Cloud Firestore connectivity"],
    ["AI Service Core Status", health.aiServiceStatus.toUpperCase(), "FastAPI & LLM pipeline readiness"],
    ["Server Telemetry Metric", health.serverStatus, "Server load metrics not currently measured"],
    ["Total Registered Active Users", metrics.totalActiveUsers, "Current active student profiles"],
    ["Total Resumes Analyzed", metrics.totalResumesParsed, "Total document parses recorded"],
    ["Total AI Feedback Outputs", metrics.totalAiFeedbackGenerated, "Total evaluation outputs"],
    ["Total Interviews Recorded", metrics.totalInterviewsConducted, "Total interview sessions completed"],
  ];

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerFileDownload(csvContent, `AIRIS_System_Health_Audit_${Date.now()}.csv`);

  await logAuditEvent("ReportsGenerated", "Downloaded System Health & Operational Audit CSV Report", adminName);
}

/**
 * 5. SECURITY AUDIT LOG REGISTRY
 */
export async function downloadAuditLogsReport(adminName: string): Promise<void> {
  const logs = await fetchAuditLogs(200);

  const headers = [
    "Audit Log ID",
    "Timestamp",
    "Action Category",
    "Performed By (Actor)",
    "Event Details",
  ];

  const rows = logs.map((l) => [
    l.id,
    l.timestamp,
    l.action,
    `"${(l.performedBy || "System").replace(/"/g, '""')}"`,
    `"${(l.details || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerFileDownload(csvContent, `AIRIS_Security_Audit_Registry_${Date.now()}.csv`);

  await logAuditEvent("ReportsGenerated", "Downloaded Security Audit Log Registry CSV Report", adminName);
}
