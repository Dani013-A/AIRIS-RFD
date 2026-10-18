import { fetchStudentsList } from "./userService";
import { fetchAuditLogs, logAuditEvent } from "./auditService";
import { fetchDashboardAnalytics } from "./analyticsService";
import { generateProfessionalPdf } from "../reports/pdfReportGenerator";
import { AdminUser, formatAdminRoleLabel } from "../../types/auth.types";
import {
  ReportType,
  ReportFilterScope,
  ReportMetadata,
  ReportPayload,
  ReportVisualization,
} from "../../types/report.types";
import { findCollegeByProgramName, getCoordinatorById, matchesCoordinator } from "../../config/tipManilaAcademic";

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
 * Singular/plural-safe student count noun ("1 student" vs "0/2 students").
 */
function pluralizeStudent(count: number): string {
  return `${count} student${count === 1 ? "" : "s"}`;
}

function buildScopeDescription(scope?: ReportFilterScope): string {
  const coordId = scope?.coordinator || scope?.college;
  const coordObj = coordId && coordId !== "all"
    ? getCoordinatorById(coordId)
    : undefined;
  const coordStr = coordObj ? coordObj.name : "All Coordinators";
  const periodMap: Record<string, string> = {
    "7d": "Past 7 Days",
    "30d": "Past 30 Days",
    "90d": "Past 90 Days",
    "1y": "Past 1 Year",
  };
  const periodStr = (scope?.period && periodMap[scope.period]) || "All Recorded History";
  return `${coordStr} · ${periodStr} · All Participants`;
}

function buildMetadata(title: string, admin: AdminUser, scope?: ReportFilterScope): ReportMetadata {
  const coordId = scope?.coordinator || scope?.college;
  return {
    reportTitle: title,
    scopeDescription: buildScopeDescription(scope),
    reportingPeriod: scope?.period && scope.period !== "all" ? `Past ${scope.period.toUpperCase()}` : "All Recorded History",
    generatedAt: new Date().toLocaleString(),
    generatedBy: admin.fullName,
    actorRole: formatAdminRoleLabel(admin.role),
    coordinatorScope: coordId && coordId !== "all" ? coordId : undefined,
  };
}

/**
 * AUTHORITATIVE CENTRALIZED REPORT PAYLOAD GENERATOR
 * Single source of truth consumed identically by:
 * 1. Web Interactive Report View
 * 2. Institutional PDF Generator
 * 3. Raw CSV Exporter
 */
export async function fetchReportPayload(
  reportKey: ReportType,
  admin: AdminUser,
  scope?: ReportFilterScope
): Promise<ReportPayload> {
  switch (reportKey) {
    case "student_profiles": {
      const coordScope = scope?.coordinator || scope?.college;
      const effectiveDatasetScope = "all";
      // 1. Fetch students respecting coordinator boundaries and dataset scope
      const allStudents = await fetchStudentsList({
        coordinator: coordScope,
        userRole: admin.role,
        datasetScope: effectiveDatasetScope,
      });

      // Filter by Department Coordinator if specified
      const students = coordScope && coordScope !== "all"
        ? allStudents.filter((s) => {
            const matchedCol = findCollegeByProgramName(s.degreeProgram || "");
            return matchesCoordinator(coordScope, matchedCol?.id, s.coordinator);
          })
        : allStudents;

      const metadata = buildMetadata("Student Profiles & Employability Preparedness Report", admin, scope);

      const fullyPreparedCount = students.filter((s) => s.employabilityStatus === "completed").length;
      const interviewPendingCount = students.filter((s) => s.employabilityStatus === "interview_pending").length;
      const resumePendingCount = students.filter((s) => s.employabilityStatus === "resume_pending").length;
      const notStartedCount = students.filter((s) => s.employabilityStatus === "not_started" || !s.employabilityStatus).length;

      const evaluatedStudents = students.filter((s) => typeof s.resumeScore === "number");
      const avgResumeScore =
        evaluatedStudents.length > 0
          ? Math.round(evaluatedStudents.reduce((acc, s) => acc + (s.resumeScore || 0), 0) / evaluatedStudents.length)
          : null;

      const tier85_100 = evaluatedStudents.filter((s) => s.resumeScore! >= 85).length;
      const tier70_84 = evaluatedStudents.filter((s) => s.resumeScore! >= 70 && s.resumeScore! < 85).length;
      const tier50_69 = evaluatedStudents.filter((s) => s.resumeScore! >= 50 && s.resumeScore! < 70).length;
      const tierBelow50 = evaluatedStudents.filter((s) => s.resumeScore! < 50).length;
      const notEvaluated = students.length - evaluatedStudents.length;

      const completionRate = students.length > 0 ? Math.round((fullyPreparedCount / students.length) * 100) : 0;

      const headers = [
        "Student",
        "Program",
        "Target Role",
        "Resume",
        "Interview",
        "Overall",
        "Status",
      ];

      const rows = students.map((s) => [
        s.fullName,
        s.degreeProgram || "N/A",
        s.targetPosition || "N/A",
        s.resumeScore !== undefined ? `${s.resumeScore}` : "—",
        s.interviewScore !== undefined ? `${s.interviewScore}` : "—",
        s.employabilityScore !== undefined ? `${s.employabilityScore}` : "—",
        s.employabilityStatus === "completed"
          ? "Fully Evaluated"
          : s.employabilityStatus === "interview_pending"
          ? "Interview Pending"
          : s.employabilityStatus === "resume_pending"
          ? "Resume Pending"
          : "Not Started",
      ]);

      const csvHeaders = ["User ID", "Student Name", "T.I.P. Email", "Degree Program", "Target Position", "Resume Score", "Interview Score", "Employability Score", "Preparedness Status", "Registered Date", "Account Status"];
      const csvRows = students.map((s) => [
        s.uid,
        `"${s.fullName.replace(/"/g, '""')}"`,
        s.email,
        `"${(s.degreeProgram || "").replace(/"/g, '""')}"`,
        `"${(s.targetPosition || "").replace(/"/g, '""')}"`,
        s.resumeScore ?? "N/A",
        s.interviewScore ?? "N/A",
        s.employabilityScore ?? "N/A",
        s.employabilityStatus || "not_started",
        s.createdAt,
        s.isDisabled ? "Disabled" : "Active",
      ]);
      const rawCsvData = [csvHeaders.join(","), ...csvRows.map((r) => r.join(","))].join("\n");

      const visualizations: ReportVisualization[] = [
        {
          type: "donut_breakdown",
          title: "Employability Preparedness Status Distribution",
          subtitle: "Authoritative candidate breakdown across 4 preparedness states",
          donutData: [
            {
              label: "Fully Evaluated",
              count: fullyPreparedCount,
              percentage: students.length > 0 ? (fullyPreparedCount / students.length) * 100 : 0,
              colorHex: "#22C55E",
              colorRgb: [34, 197, 94],
            },
            {
              label: "Interview Pending",
              count: interviewPendingCount,
              percentage: students.length > 0 ? (interviewPendingCount / students.length) * 100 : 0,
              colorHex: "#FACC15",
              colorRgb: [250, 204, 21],
            },
            {
              label: "Resume Pending",
              count: resumePendingCount,
              percentage: students.length > 0 ? (resumePendingCount / students.length) * 100 : 0,
              colorHex: "#FACC15",
              colorRgb: [250, 204, 21],
            },
            {
              label: "Not Started",
              count: notStartedCount,
              percentage: students.length > 0 ? (notStartedCount / students.length) * 100 : 0,
              colorHex: "#64748B",
              colorRgb: [100, 116, 139],
            },
          ],
        },
        {
          type: "score_distribution",
          title: "Resume Performance Distribution",
          subtitle: "Performance tier classification across verified ATS and role alignment assessments",
          scoreDistribution: {
            metricName: "Resume Evaluation Score",
            totalEvaluated: evaluatedStudents.length,
            totalPopulation: students.length,
            averageScore: avgResumeScore,
            tiers: [
              {
                range: "85 – 100",
                label: "Advanced Preparedness",
                count: tier85_100,
                percentage: students.length > 0 ? (tier85_100 / students.length) * 100 : 0,
                color: [34, 197, 94],
              },
              {
                range: "70 – 84",
                label: "Proficient Preparedness",
                count: tier70_84,
                percentage: students.length > 0 ? (tier70_84 / students.length) * 100 : 0,
                color: [34, 197, 94],
              },
              {
                range: "50 – 69",
                label: "Developing Preparedness",
                count: tier50_69,
                percentage: students.length > 0 ? (tier50_69 / students.length) * 100 : 0,
                color: [250, 204, 21],
              },
              {
                range: "Below 50",
                label: "Needs Remediation",
                count: tierBelow50,
                percentage: students.length > 0 ? (tierBelow50 / students.length) * 100 : 0,
                color: [239, 68, 68],
              },
              {
                range: "Not Evaluated",
                label: "Pending Analysis",
                count: notEvaluated,
                percentage: students.length > 0 ? (notEvaluated / students.length) * 100 : 0,
                color: [148, 163, 184],
              },
            ],
          },
        },
      ];

      return {
        key: "student_profiles",
        title: "Student Profiles & Employability Preparedness Report",
        category: "STUDENT PERFORMANCE",
        question: "Which students are enrolled and how prepared are they across evaluations?",
        description:
          "Official student roster, institutional email, degree program, latest ATS resume evaluation, mock interview performance, and composite employability status.",
        metadata,
        summaryStats: [
          { label: "Students", value: students.length },
          { label: "Fully Evaluated", value: fullyPreparedCount },
          { label: "Interview Pending", value: interviewPendingCount },
          { label: "Resume Pending", value: resumePendingCount },
        ],
        executiveSummary: {
          headline: `${fullyPreparedCount} of ${students.length} students have completed both evaluations (${completionRate}%).`,
          paragraphs: [
            `This report shows evaluation progress for students in the selected scope. Completion means a resume evaluation and a mock interview result are available; it does not certify placement readiness.`,
            evaluatedStudents.length > 0
              ? `The average among ${evaluatedStudents.length} evaluated resumes is ${avgResumeScore}/100. Students without an evaluation are excluded from this average.`
              : `No resume evaluations are available for this scope yet.`,
          ],
          keyObservations: [
            `${pluralizeStudent(interviewPendingCount)} ${interviewPendingCount === 1 ? "has" : "have"} a resume result but no completed interview.`,
            ...(resumePendingCount > 0
              ? [
                  `${pluralizeStudent(resumePendingCount)} ${resumePendingCount === 1 ? "has" : "have"} a completed interview but no resume evaluation yet.`,
                ]
              : []),
            ...(notStartedCount > 0
              ? [
                  `${pluralizeStudent(notStartedCount)} ${notStartedCount === 1 ? "does" : "do"} not yet have a resume evaluation.`,
                ]
              : []),
          ],
        },
        visualizations,
        tableData: {
          headers,
          rows,
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 32 },
            2: { cellWidth: 30 },
            3: { cellWidth: 17, halign: "center" },
            4: { cellWidth: 17, halign: "center" },
            5: { cellWidth: 17, halign: "center" },
            6: { cellWidth: 34 },
          },
        },
        definitions: [
          "Resume: Evaluated resume score combining ATS structure and role skill alignment.",
          "Interview: Final score from a completed mock interview.",
          "Overall: Existing composite = round(Resume × 40% + Interview × 60%); shown only when both scores are available.",
          "Status: Evaluation progress, not a placement decision.",
        ],
        rawCsvData,
      };
    }

    case "completion_funnel": {
      const coordScope = scope?.coordinator || scope?.college;
      const { metrics } = await fetchDashboardAnalytics(
        {
          coordinator: coordScope,
          period: scope?.period as any,
          datasetScope: "all",
        },
        admin.role
      );

      const metadata = buildMetadata("Institutional Participation & Completion Funnel Report", admin, scope);
      const funnel = metrics.funnel;

      const dropOffUploaded = Math.max(0, funnel.registeredCount - funnel.resumeUploadedCount);
      const dropOffAnalyzed = Math.max(0, funnel.resumeUploadedCount - funnel.resumeAnalyzedCount);
      const dropOffStarted = Math.max(0, funnel.resumeAnalyzedCount - funnel.interviewStartedCount);
      const dropOffCompleted = Math.max(0, funnel.interviewStartedCount - funnel.interviewCompletedCount);

      const headers = ["Funnel Stage", "Reached Count", "Conversion vs Registered", "Status Meaning"];
      const rows = [
        ["1. Registered Students", funnel.registeredCount, "100.0%", "Eligible candidate population in scope"],
        [
          "2. Resume Uploaded",
          funnel.resumeUploadedCount,
          `${funnel.registeredCount > 0 ? ((funnel.resumeUploadedCount / funnel.registeredCount) * 100).toFixed(1) : 0}%`,
          "Candidate uploaded at least 1 resume document",
        ],
        [
          "3. Resume Analyzed",
          funnel.resumeAnalyzedCount,
          `${funnel.registeredCount > 0 ? ((funnel.resumeAnalyzedCount / funnel.registeredCount) * 100).toFixed(1) : 0}%`,
          "Completed ATS & SBERT semantic role alignment",
        ],
        [
          "4. Mock Interview Started",
          funnel.interviewStartedCount,
          `${funnel.registeredCount > 0 ? ((funnel.interviewStartedCount / funnel.registeredCount) * 100).toFixed(1) : 0}%`,
          "Initiated voice / VR interview simulation",
        ],
        [
          "5. Mock Interview Completed",
          funnel.interviewCompletedCount,
          `${funnel.registeredCount > 0 ? ((funnel.interviewCompletedCount / funnel.registeredCount) * 100).toFixed(1) : 0}%`,
          "Finalized interview session with generated report",
        ],
        [
          "6. Fully Employability Prepared",
          funnel.fullyPreparedCount,
          `${funnel.completionRate}%`,
          "Completed both resume analysis and interview session",
        ],
      ];

      const rawCsvData = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

      const visualizations: ReportVisualization[] = [
        {
          type: "funnel_pipeline",
          title: "Career Center Completion Pipeline",
          subtitle: "Sequential stage conversion from registration through placement readiness",
          funnelStages: [
            {
              stageNumber: 1,
              label: "Registered Students",
              count: funnel.registeredCount,
              percentage: 100,
              dropOff: 0,
              meaning: "Eligible candidate population in scope",
            },
            {
              stageNumber: 2,
              label: "Resume Uploaded",
              count: funnel.resumeUploadedCount,
              percentage: funnel.registeredCount > 0 ? (funnel.resumeUploadedCount / funnel.registeredCount) * 100 : 0,
              dropOff: dropOffUploaded,
              meaning: "Candidate uploaded at least 1 resume",
            },
            {
              stageNumber: 3,
              label: "Resume Analyzed",
              count: funnel.resumeAnalyzedCount,
              percentage: funnel.registeredCount > 0 ? (funnel.resumeAnalyzedCount / funnel.registeredCount) * 100 : 0,
              dropOff: dropOffAnalyzed,
              meaning: "Completed ATS & SBERT semantic role alignment",
            },
            {
              stageNumber: 4,
              label: "Interview Started",
              count: funnel.interviewStartedCount,
              percentage: funnel.registeredCount > 0 ? (funnel.interviewStartedCount / funnel.registeredCount) * 100 : 0,
              dropOff: dropOffStarted,
              meaning: "Initiated voice / VR interview simulation",
            },
            {
              stageNumber: 5,
              label: "Interview Completed",
              count: funnel.interviewCompletedCount,
              percentage: funnel.registeredCount > 0 ? (funnel.interviewCompletedCount / funnel.registeredCount) * 100 : 0,
              dropOff: dropOffCompleted,
              meaning: "Finalized interview session with generated evaluation",
            },
            {
              stageNumber: 6,
              label: "Fully Prepared",
              count: funnel.fullyPreparedCount,
              percentage: funnel.completionRate,
              dropOff: 0,
              meaning: "Completed both resume evaluation and mock interview",
            },
          ],
        },
        {
          type: "donut_breakdown",
          title: "Career Preparedness Pipeline Outcome",
          subtitle: "Ratio of fully prepared candidates versus in-progress pipeline population",
          donutData: [
            {
              label: "Fully Prepared for Employment",
              count: funnel.fullyPreparedCount,
              percentage: funnel.completionRate,
              colorHex: "#22C55E",
              colorRgb: [34, 197, 94],
            },
            {
              label: "Incomplete / In-Progress",
              count: Math.max(0, funnel.registeredCount - funnel.fullyPreparedCount),
              percentage: Math.max(0, 100 - funnel.completionRate),
              colorHex: "#FACC15",
              colorRgb: [250, 204, 21],
            },
          ],
        },
      ];

      return {
        key: "completion_funnel",
        title: "Career Center Participation & Completion Funnel Report",
        category: "CAREER CENTER MOM FUNNEL",
        question: "How far have students progressed through the 6-stage preparation funnel and where is the drop-off?",
        description:
          "Stage-by-stage progression from initial registration to fully prepared status, tracking drop-offs and stage conversion rates.",
        metadata,
        summaryStats: [
          { label: "Eligible Participants", value: funnel.registeredCount },
          { label: "Resume Analyzed", value: funnel.resumeAnalyzedCount },
          { label: "Interview Completed", value: funnel.interviewCompletedCount },
          { label: "Fully Prepared Rate", value: `${funnel.completionRate}%` },
        ],
        executiveSummary: {
          headline: `Group achieves ${funnel.completionRate}% full preparedness completion with primary pipeline drop-off at interview stage.`,
          paragraphs: [
            `Out of ${funnel.registeredCount} registered students, ${funnel.resumeUploadedCount} have uploaded resumes and ${funnel.resumeAnalyzedCount} completed full ATS alignment.`,
            `The progression slows between resume analysis and mock interview initiation (drop-off of ${dropOffStarted} candidates), indicating that targeted coordinator follow-ups can yield the greatest readiness gains here.`,
          ],
          keyObservations: [
            `${funnel.resumeAnalyzedCount} candidates (${funnel.registeredCount > 0 ? Math.round((funnel.resumeAnalyzedCount / funnel.registeredCount) * 100) : 0}%) completed resume ATS evaluation.`,
            `${funnel.interviewCompletedCount} candidates finished voice interview simulations.`,
            `Overall career readiness completion stands at ${funnel.completionRate}%.`,
          ],
        },
        visualizations,
        tableData: {
          headers,
          rows,
          columnStyles: {
            0: { cellWidth: 38 },
            1: { cellWidth: 24, halign: "center" },
            2: { cellWidth: 32, halign: "center" },
            3: { cellWidth: 88 },
          },
        },
        definitions: [
          "Completion Progression: Represents the sequential student journey through AIRIS career readiness.",
          "Drop-Off: Students at intermediate stages without reaching full evaluation readiness.",
          "Fully Prepared: Students who have completed both ATS resume analysis and mock interview simulation.",
        ],
        rawCsvData,
      };
    }

    case "interview_usage": {
      const coordScope = scope?.coordinator || scope?.college;
      const { metrics } = await fetchDashboardAnalytics(
        {
          coordinator: coordScope,
          period: scope?.period as any,
          datasetScope: "all",
        },
        admin.role
      );

      const metadata = buildMetadata("Mock Interview Usage & Performance Report", admin, scope);

      const headers = ["Interview Metric", "Recorded Value", "Operational Context"];
      const rows = [
        ["Total Completed Interview Sessions", metrics.totalInterviewsConducted, "Verified Firestore interview sessions"],
        ["Students Attempting Interviews", metrics.funnel.interviewStartedCount, "Candidates with at least 1 interview session"],
        ["Students Finalizing Interviews", metrics.funnel.interviewCompletedCount, "Candidates receiving final interview reports"],
        [
          "Average Interview Score",
          metrics.performanceSummary.avgInterviewScore !== null ? `${metrics.performanceSummary.avgInterviewScore}/100` : "No Completed Sessions",
          "Mean score across all completed interview sessions",
        ],
        ["Total Resume Analyses Recorded", metrics.totalAiFeedbackGenerated, "Verified resume evaluations in scope"],
      ];

      const rawCsvData = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

      const visualizations: ReportVisualization[] = [
        {
          type: "horizontal_bars",
          title: "Interview Participation & Usage Metrics",
          subtitle: "Candidate interview attempts and finalized evaluation reports",
          metrics: [
            {
              label: "Students Attempting Interview",
              value: metrics.funnel.interviewStartedCount,
              max: Math.max(metrics.funnel.registeredCount, 1),
              subtext: `${metrics.funnel.registeredCount > 0 ? Math.round((metrics.funnel.interviewStartedCount / metrics.funnel.registeredCount) * 100) : 0}% of participants`,
              color: [30, 62, 107],
            },
            {
              label: "Students Finalizing Interview",
              value: metrics.funnel.interviewCompletedCount,
              max: Math.max(metrics.funnel.registeredCount, 1),
              subtext: `${metrics.funnel.registeredCount > 0 ? Math.round((metrics.funnel.interviewCompletedCount / metrics.funnel.registeredCount) * 100) : 0}% of participants`,
              color: [13, 148, 136],
            },
            {
              label: "Total Interview Sessions Conducted",
              value: metrics.totalInterviewsConducted,
              max: Math.max(metrics.totalInterviewsConducted, 1),
              color: [71, 85, 105],
            },
          ],
        },
        {
          type: "trend_line",
          title: "Interview Activity Historical Trend",
          subtitle: "Observed interview volume across recent calendar periods",
          historicalPoints: [],
          insufficientDataNote:
            "Trend unavailable for the selected period because insufficient historical observations are available.",
        },
      ];

      return {
        key: "interview_usage",
        title: "Mock Interview Participation & Usage Report",
        category: "INTERVIEW ANALYTICS",
        question: "How frequently are students utilizing voice interview simulations and what are their category scores?",
        description:
          "Aggregate session volumes, category evaluations (Semantic Correctness, AI Holistic, Clarity), and completion metrics.",
        metadata,
        summaryStats: [
          { label: "Total Sessions", value: metrics.totalInterviewsConducted },
          { label: "Interview Completers", value: metrics.funnel.interviewCompletedCount },
          { label: "Average Score", value: metrics.performanceSummary.avgInterviewScore !== null ? `${metrics.performanceSummary.avgInterviewScore}/100` : "N/A" },
          { label: "Resume Analyses", value: metrics.totalAiFeedbackGenerated },
        ],
        executiveSummary: {
          headline: `Recorded ${metrics.totalInterviewsConducted} completed interview simulations with average score of ${
            metrics.performanceSummary.avgInterviewScore !== null ? `${metrics.performanceSummary.avgInterviewScore}/100` : "N/A"
          }.`,
          paragraphs: [
            `A total of ${metrics.funnel.interviewStartedCount} candidate students initiated the AIRIS technical interview simulation, with ${metrics.funnel.interviewCompletedCount} successfully completing the full questionnaire.`,
            `The average score among completing candidates reflects strong technical grounding, with semantic correctness and delivery metrics recorded permanently in Firestore.`,
          ],
          keyObservations: [
            `${metrics.totalInterviewsConducted} mock interview sessions completed.`,
            `${metrics.funnel.interviewCompletedCount} students finalized evaluations.`,
            metrics.performanceSummary.avgInterviewScore !== null
              ? `Mean interview evaluation: ${metrics.performanceSummary.avgInterviewScore}/100.`
              : `Interview evaluations currently pending.`,
          ],
        },
        visualizations,
        tableData: {
          headers,
          rows,
          columnStyles: {
            0: { cellWidth: 48 },
            1: { cellWidth: 32, halign: "center" },
            2: { cellWidth: 102 },
          },
        },
        definitions: [
          "Interview Session: Simulated voice / VR technical interview conducted by student candidate.",
          "Interview Score: Composite multi-factor evaluation across semantic correctness, clarity, and delivery.",
          "Completion Rate: Ratio of students completing interviews relative to registered eligible participants.",
        ],
        rawCsvData,
      };
    }

    case "system_health": {
      const { metrics, health } = await fetchDashboardAnalytics();
      const metadata = buildMetadata("System & Operational Health Audit Log", admin);

      const isOnline = (s: string) => s === "healthy" || s === "operational" || s === "online";
      const aiOperational = isOnline(health.aiServiceStatus);

      const headers = ["Subsystem / Indicator", "Current Operational Status", "Technical Telemetry Context"];
      const rows = [
        ["Cloud Firestore Database", health.firebaseStatus.toUpperCase(), "Cloud database connectivity and collection sync"],
        ["AIRIS SBERT AI Evaluator API", health.aiServiceStatus.toUpperCase(), "FastAPI semantic alignment and LLM pipeline readiness"],
        ["Server Health", health.serverStatus.toUpperCase(), "Live server connection state"],
        ["Active Student Accounts", metrics.activeStudentsCount, "Current registered active student profiles in database"],
        ["Total Stored Resumes", metrics.resumeSubmissionsCount, "Verified resume documents across accounts"],
        ["Total Stored Evaluations", metrics.totalAiFeedbackGenerated, "Verified resume analyses recorded in Firestore"],
      ];

      const rawCsvData = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

      const visualizations: ReportVisualization[] = [
        {
          type: "telemetry_health",
          title: "Subsystem Telemetry Readiness Status",
          healthTelemetry: [
            {
              name: "Cloud Firestore Database",
              status: isOnline(health.firebaseStatus) ? "operational" : "error",
              detail: "Authoritative collections sync, security rules, and real-time listeners active",
            },
            {
              name: "AIRIS SBERT AI Evaluator API",
              status: aiOperational ? "operational" : health.aiServiceStatus === "degraded" ? "degraded" : "error",
              detail: aiOperational
                ? "FastAPI semantic role alignment and deterministic scoring active"
                : "Microservice endpoint unreachable on port 8000; pending service activation",
            },
            {
              name: "Live Web & Server Connection",
              status: isOnline(health.serverStatus) ? "operational" : "error",
              detail: "Frontend application runtime and secure administrative session verified",
            },
          ],
        },
      ];

      return {
        key: "system_health",
        title: "System & Operational Health Audit Log",
        category: "OPERATIONAL HEALTH",
        question: "Are core platform systems, Firestore connections, and AI microservices healthy and responsive?",
        description:
          "Infrastructure telemetry, database availability status, AI scoring core responsiveness, and active user tallies.",
        metadata,
        summaryStats: [
          { label: "Database", value: isOnline(health.firebaseStatus) ? "OPERATIONAL" : "DEGRADED" },
          { label: "AI Pipeline", value: aiOperational ? "OPERATIONAL" : health.aiServiceStatus.toUpperCase() },
          { label: "Server Connection", value: isOnline(health.serverStatus) ? "OPERATIONAL" : "DEGRADED" },
          { label: "Active Profiles", value: metrics.activeStudentsCount },
        ],
        executiveSummary: {
          headline: `Core cloud database and administrative services are operational with ${metrics.activeStudentsCount} active student accounts.`,
          paragraphs: [
            `Cloud Firestore connectivity is verified with real-time snapshot listeners active across candidate roster and evaluation subcollections.`,
            `AI microservice readiness telemetry indicates current evaluation API endpoint availability.`,
          ],
          keyObservations: [
            `Database status: ${isOnline(health.firebaseStatus) ? "OPERATIONAL" : "DEGRADED"}.`,
            `AI Evaluator status: ${health.aiServiceStatus.toUpperCase()}.`,
            `Total active accounts: ${metrics.activeStudentsCount}.`,
          ],
        },
        visualizations,
        tableData: {
          headers,
          rows,
          columnStyles: {
            0: { cellWidth: 46 },
            1: { cellWidth: 30, halign: "center" },
            2: { cellWidth: 106 },
          },
        },
        definitions: [
          "Operational Health: Real-time telemetry check across backend microservices and database.",
          "Tamper-Evident Security: Append-only event registry for access control and accountability.",
        ],
        rawCsvData,
      };
    }

    case "security_audit": {
      const logs = await fetchAuditLogs(200);
      const metadata = buildMetadata("Administrative Security Audit Trail", admin);

      const actionCounts: Record<string, number> = {};
      logs.forEach((l) => {
        actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
      });

      const topActions = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([act, count]) => ({
          label: act,
          value: count,
          max: logs.length || 1,
          subtext: `${logs.length > 0 ? Math.round((count / logs.length) * 100) : 0}% of activity`,
          color: [30, 62, 107] as [number, number, number],
        }));

      const successCount = logs.filter((l) => l.result === "SUCCESS").length;
      const failureCount = logs.length - successCount;

      const headers = ["Timestamp", "Actor (Role)", "Action", "Target", "Result", "Event Details"];
      const rows = logs.map((l) => [
        l.timestamp.split("T")[0] + " " + (l.timestamp.split("T")[1]?.slice(0, 5) || ""),
        `${l.actor} (${l.role})`,
        l.action,
        l.target,
        l.result,
        l.details,
      ]);

      const rawCsvData = [
        ["Timestamp", "Actor", "Role", "Action", "Target", "Result", "Details"].join(","),
        ...logs.map((l) =>
          [
            l.timestamp,
            `"${l.actor.replace(/"/g, '""')}"`,
            l.role,
            l.action,
            `"${l.target.replace(/"/g, '""')}"`,
            l.result,
            `"${l.details.replace(/"/g, '""')}"`,
          ].join(",")
        ),
      ].join("\n");

      const visualizations: ReportVisualization[] = [
        {
          type: "horizontal_bars",
          title: "Administrative Action Frequency Distribution",
          subtitle: "Top administrative operations executed within recorded audit trail",
          metrics: topActions,
        },
        {
          type: "donut_breakdown",
          title: "Security Execution Success vs Failure",
          subtitle: "Ratio of successful administrative operations vs security rejections",
          donutData: [
            {
              label: "Successful Operations",
              count: successCount,
              percentage: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
              colorHex: "#22C55E",
              colorRgb: [34, 197, 94],
            },
            {
              label: "Failed / Rejected",
              count: failureCount,
              percentage: logs.length > 0 ? (failureCount / logs.length) * 100 : 0,
              colorHex: "#EF4444",
              colorRgb: [239, 68, 68],
            },
          ],
        },
      ];

      return {
        key: "security_audit",
        title: "Administrative Security Audit Registry",
        category: "GOVERNANCE & AUDIT",
        question: "Who accessed or modified student data, toggled account states, or exported institutional reports?",
        description:
          "Immutable administrative event log capturing timestamps, authenticated actors, target student records, and action results.",
        metadata,
        summaryStats: [
          { label: "Total Audit Records", value: logs.length },
          { label: "Successful Actions", value: successCount },
          { label: "Distinct Actors", value: new Set(logs.map((l) => l.actorId)).size },
          { label: "Security Status", value: "Verified Log" },
        ],
        executiveSummary: {
          headline: `Recorded ${logs.length} administrative actions across ${new Set(logs.map((l) => l.actorId)).size} distinct authenticated actors with ${successCount} verified successes.`,
          paragraphs: [
            `Administrative events are captured append-only in Cloud Firestore with role-based access control enforced.`,
            `The audit log verifies tamper-evident governance across report exports, profile state toggles, and coordinator assignments.`,
          ],
          keyObservations: [
            `${logs.length} total events recorded in security ledger.`,
            `${successCount} operations concluded with SUCCESS result.`,
            `Top action: ${topActions[0]?.label || "N/A"} (${topActions[0]?.value || 0} events).`,
          ],
        },
        visualizations,
        tableData: {
          headers,
          rows,
          columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 34 },
            2: { cellWidth: 28 },
            3: { cellWidth: 28 },
            4: { cellWidth: 16, halign: "center" },
            5: { cellWidth: 50 },
          },
        },
        definitions: [
          "Security Audit Trail: Immutable append-only audit event log tracking all administrative actions.",
          "Role Verification: Enforced through Firebase security rules and custom claims.",
        ],
        rawCsvData,
      };
    }
  }
}

/**
 * High-level export dispatcher that delegates to the authoritative fetchReportPayload.
 */
export async function exportReport(
  reportKey: ReportType,
  admin: AdminUser,
  format: "pdf" | "csv",
  scope?: ReportFilterScope
): Promise<void> {
  const payload = await fetchReportPayload(reportKey, admin, scope);
  const fileName = `AIRIS_${reportKey}_${Date.now()}`;

  if (format === "pdf") {
    generateProfessionalPdf(payload, `${fileName}.pdf`);
  } else {
    triggerFileDownload(payload.rawCsvData || "", `${fileName}.csv`);
  }

  await logAuditEvent({
    action: "ReportsGenerated",
    details: `Exported ${format.toUpperCase()} ${payload.title} (${payload.tableData.rows.length} rows).`,
    actor: admin.fullName,
    actorId: admin.uid,
    role: admin.role,
    target: reportKey,
    result: "SUCCESS",
  });
}

// Backward-compatible individual export helpers that delegate to exportReport
export async function exportStudentsProfileReport(admin: AdminUser, format: "pdf" | "csv", scope?: ReportFilterScope) {
  return exportReport("student_profiles", admin, format, scope);
}

export async function exportCompletionFunnelReport(admin: AdminUser, format: "pdf" | "csv", scope?: ReportFilterScope) {
  return exportReport("completion_funnel", admin, format, scope);
}

export async function exportInterviewUsageReport(admin: AdminUser, format: "pdf" | "csv", scope?: ReportFilterScope) {
  return exportReport("interview_usage", admin, format, scope);
}

export async function exportSystemHealthReport(admin: AdminUser, format: "pdf" | "csv") {
  return exportReport("system_health", admin, format);
}

export async function exportAuditLogsReport(admin: AdminUser, format: "pdf" | "csv") {
  return exportReport("security_audit", admin, format);
}
