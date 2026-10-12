import fs from "fs";
import path from "path";
import { generateProfessionalPdf } from "../src/services/reports/pdfReportGenerator";
import { ReportPayload } from "../src/types/report.types";

const outDir = path.resolve(__dirname, "test_output");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Student Profiles Payload
const studentProfilesPayload: ReportPayload = {
  key: "student_profiles",
  title: "Student Profiles & Employability Preparedness Report",
  category: "STUDENT PERFORMANCE",
  question: "Which students are enrolled and how prepared are they across evaluations?",
  description:
    "Student roster, institutional email, degree program, latest ATS resume evaluation, mock interview performance, and composite employability status.",
  metadata: {
    reportTitle: "Student Profiles & Employability Preparedness Report",
    scopeDescription: "CCS Coordinator (College of Computer Studies) · All Recorded History",
    reportingPeriod: "All Recorded History",
    generatedAt: "September 21, 2026, 2:15 AM",
    generatedBy: "Career Center Administrator",
    actorRole: "Career Center Admin",
    orientation: "portrait",
  },
  summaryStats: [
    { label: "Total Students in Scope", value: 14 },
    { label: "Fully Evaluated", value: 5 },
    { label: "Pending Interview", value: 7 },
    { label: "Average Resume Score", value: "81/100" },
  ],
  executiveSummary: {
    headline: "Cohort of 14 students exhibits 36% overall employability preparedness completion rate.",
    paragraphs: [
      "A total of 14 eligible students were analyzed across the selected academic scope in the College of Computer Studies. Of these, 5 student candidates have completed both the automated resume analysis and the mock technical interview simulation, achieving placement-ready status.",
      "Among evaluated resumes, the cohort average score stands at 81/100, with 9 students performing in proficient or advanced preparedness tiers. Active coordination is underway to transition remaining candidates into interview simulations.",
    ],
    keyObservations: [
      "5 of 14 candidates are fully evaluated and ready for OJT placement.",
      "7 candidates require mock interview completion to finalize their readiness profile.",
      "2 candidates have not yet submitted a verified resume document.",
    ],
  },
  visualizations: [
    {
      type: "donut_breakdown",
      title: "Employability Preparedness Status Distribution",
      subtitle: "Authoritative candidate breakdown across 4 readiness states",
      donutData: [
        { label: "Fully Evaluated", count: 5, percentage: 35.7, colorHex: "#0D9488", colorRgb: [13, 148, 136] },
        { label: "Interview Pending", count: 7, percentage: 50.0, colorHex: "#1E3E6B", colorRgb: [30, 62, 107] },
        { label: "Resume Pending", count: 1, percentage: 7.1, colorHex: "#D97706", colorRgb: [217, 119, 6] },
        { label: "Not Started", count: 1, percentage: 7.1, colorHex: "#64748B", colorRgb: [100, 116, 139] },
      ],
    },
    {
      type: "score_distribution",
      title: "Cohort Resume Performance Distribution",
      subtitle: "Performance tier classification across verified ATS and role alignment assessments",
      scoreDistribution: {
        metricName: "Resume Evaluation Score",
        totalEvaluated: 12,
        totalPopulation: 14,
        averageScore: 81,
        tiers: [
          { range: "85 – 100", label: "Advanced Preparedness", count: 4, percentage: 28.6, color: [13, 148, 136] },
          { range: "70 – 84", label: "Proficient Preparedness", count: 5, percentage: 35.7, color: [30, 62, 107] },
          { range: "50 – 69", label: "Developing Preparedness", count: 3, percentage: 21.4, color: [71, 85, 105] },
          { range: "Below 50", label: "Needs Remediation", count: 0, percentage: 0.0, color: [225, 29, 72] },
          { range: "Not Evaluated", label: "Pending Analysis", count: 2, percentage: 14.3, color: [148, 163, 184] },
        ],
      },
    },
  ],
  tableData: {
    headers: [
      "Student Name",
      "TIP Email",
      "Degree Program",
      "Target Position",
      "Resume",
      "Interview",
      "Composite",
      "Preparedness",
    ],
    rows: [
      ["Daniel Tan", "daniel.tan@tip.edu.ph", "BSIT", "Frontend Dev", "88/100", "85/100", "86/100", "Fully Evaluated"],
      ["Althea Santos", "althea.santos@tip.edu.ph", "BSCS", "Data Analyst", "84/100", "82/100", "83/100", "Fully Evaluated"],
      ["Carlos Reyes", "carlos.reyes@tip.edu.ph", "BSIT", "Fullstack Dev", "91/100", "89/100", "90/100", "Fully Evaluated"],
      ["Maria Gomez", "maria.gomez@tip.edu.ph", "BSCS", "AI Engineer", "87/100", "84/100", "85/100", "Fully Evaluated"],
      ["Joshua Lim", "joshua.lim@tip.edu.ph", "BSIT", "QA Engineer", "78/100", "75/100", "76/100", "Fully Evaluated"],
      ["Bea Dela Cruz", "bea.delacruz@tip.edu.ph", "BSIT", "Cloud Assoc", "82/100", "Incomplete", "Incomplete", "Interview Pending"],
      ["Mark Bautista", "mark.bautista@tip.edu.ph", "BSCS", "Backend Dev", "76/100", "Incomplete", "Incomplete", "Interview Pending"],
      ["Patricia Luna", "patricia.luna@tip.edu.ph", "BSIT", "UI Designer", "73/100", "Incomplete", "Incomplete", "Interview Pending"],
      ["Gabriel Ramos", "gabriel.ramos@tip.edu.ph", "BSCS", "DevOps Eng", "79/100", "Incomplete", "Incomplete", "Interview Pending"],
      ["Janice Sy", "janice.sy@tip.edu.ph", "BSIT", "Cybersec Anal", "68/100", "Incomplete", "Incomplete", "Interview Pending"],
      ["Kevin Cruz", "kevin.cruz@tip.edu.ph", "BSCS", "Game Dev", "64/100", "Incomplete", "Incomplete", "Interview Pending"],
      ["Andrea Diaz", "andrea.diaz@tip.edu.ph", "BSIT", "Database Admin", "58/100", "Incomplete", "Incomplete", "Interview Pending"],
      ["Miguel Ocampo", "miguel.ocampo@tip.edu.ph", "BSIT", "IT Specialist", "Not Eval", "Incomplete", "Incomplete", "Resume Pending"],
      ["Samantha Yu", "samantha.yu@tip.edu.ph", "BSCS", "Software Eng", "Not Eval", "Incomplete", "Incomplete", "Not Started"],
    ],
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 38 },
      2: { cellWidth: 16 },
      3: { cellWidth: 24 },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 18, halign: "center" },
      7: { cellWidth: 24 },
    },
  },
  definitions: [
    "Resume Score: Official evaluated resume score (ATS + SBERT Semantic Role Alignment).",
    "Interview Score: Final composite performance across verified mock interview session.",
    "Employability Score: Authoritative composite = round(Resume × 40% + Interview × 60%). Missing evaluations remain Incomplete Data.",
    "Preparedness Status: Canonical stage reflecting evaluation progress (Fully Evaluated, Interview Pending, Resume Pending, Not Started).",
  ],
};

// 2. Completion Funnel Payload
const completionFunnelPayload: ReportPayload = {
  key: "completion_funnel",
  title: "Career Center Participation & Completion Funnel Report",
  category: "CAREER CENTER MOM FUNNEL",
  question: "How far have students progressed through the 6-stage preparation funnel and where is the drop-off?",
  description:
    "Stage-by-stage progression from initial registration to fully prepared status, tracking drop-offs and stage conversion rates.",
  metadata: {
    reportTitle: "Career Center Participation & Completion Funnel Report",
    scopeDescription: "All Coordinators · All Recorded History",
    reportingPeriod: "All Recorded History",
    generatedAt: "September 21, 2026, 2:15 AM",
    generatedBy: "Career Center Administrator",
    actorRole: "Career Center Admin",
    orientation: "portrait",
  },
  summaryStats: [
    { label: "Eligible Cohort", value: 14 },
    { label: "Resume Analyzed", value: 12 },
    { label: "Interview Completed", value: 5 },
    { label: "Fully Prepared Rate", value: "36%" },
  ],
  executiveSummary: {
    headline: "Cohort achieves 36% full preparedness completion with primary pipeline drop-off at interview stage.",
    paragraphs: [
      "Out of 14 registered students, 12 have uploaded resumes and completed full ATS alignment. The sequential conversion demonstrates strong initial engagement with the resume diagnostics subsystem.",
      "The progression slows between resume analysis and mock interview initiation (drop-off of 7 candidates), indicating that targeted coordinator follow-ups can yield the greatest readiness gains here.",
    ],
    keyObservations: [
      "12 candidates (86%) completed resume ATS evaluation.",
      "5 candidates finalized voice interview simulations.",
      "Overall career readiness completion stands at 36%.",
    ],
  },
  visualizations: [
    {
      type: "funnel_pipeline",
      title: "Career Center Completion Pipeline",
      subtitle: "Sequential stage conversion from registration through placement readiness",
      funnelStages: [
        { stageNumber: 1, label: "Registered Students", count: 14, percentage: 100, dropOff: 0, meaning: "Eligible candidate population in scope" },
        { stageNumber: 2, label: "Resume Uploaded", count: 12, percentage: 85.7, dropOff: 2, meaning: "Candidate uploaded at least 1 resume" },
        { stageNumber: 3, label: "Resume Analyzed", count: 12, percentage: 85.7, dropOff: 0, meaning: "Completed ATS & SBERT semantic role alignment" },
        { stageNumber: 4, label: "Interview Started", count: 5, percentage: 35.7, dropOff: 7, meaning: "Initiated voice / VR interview simulation" },
        { stageNumber: 5, label: "Interview Completed", count: 5, percentage: 35.7, dropOff: 0, meaning: "Finalized interview session with generated evaluation" },
        { stageNumber: 6, label: "Fully Prepared", count: 5, percentage: 35.7, dropOff: 0, meaning: "Completed both resume evaluation and mock interview" },
      ],
    },
    {
      type: "donut_breakdown",
      title: "Career Preparedness Pipeline Outcome",
      subtitle: "Ratio of fully prepared candidates versus in-progress pipeline population",
      donutData: [
        { label: "Fully Prepared for Employment", count: 5, percentage: 35.7, colorHex: "#0D9488", colorRgb: [13, 148, 136] },
        { label: "Incomplete / In-Progress", count: 9, percentage: 64.3, colorHex: "#1E3E6B", colorRgb: [30, 62, 107] },
      ],
    },
  ],
  tableData: {
    headers: ["Funnel Stage", "Reached Count", "Conversion vs Registered", "Status Meaning"],
    rows: [
      ["1. Registered Students", 14, "100.0%", "Eligible candidate population in scope"],
      ["2. Resume Uploaded", 12, "85.7%", "Candidate uploaded at least 1 resume document"],
      ["3. Resume Analyzed", 12, "85.7%", "Completed ATS & SBERT semantic role alignment"],
      ["4. Mock Interview Started", 5, "35.7%", "Initiated voice / VR interview simulation"],
      ["5. Mock Interview Completed", 5, "35.7%", "Finalized interview session with generated report"],
      ["6. Fully Employability Prepared", 5, "35.7%", "Completed both resume analysis and interview session"],
    ],
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 24, halign: "center" },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 84 },
    },
  },
  definitions: [
    "Completion Progression: Represents the sequential student journey through AIRIS career readiness.",
    "Drop-Off: Students at intermediate stages without reaching full evaluation readiness.",
    "Fully Prepared: Students who have completed both ATS resume analysis and mock interview simulation.",
  ],
};

// 3. Interview Usage Payload
const interviewUsagePayload: ReportPayload = {
  key: "interview_usage",
  title: "Mock Interview Participation & Usage Report",
  category: "INTERVIEW ANALYTICS",
  question: "How frequently are students utilizing voice interview simulations and what are their category scores?",
  description:
    "Aggregate session volumes, category evaluations (Semantic Correctness, AI Holistic, Clarity), and completion metrics.",
  metadata: {
    reportTitle: "Mock Interview Participation & Usage Report",
    scopeDescription: "All Coordinators · All Recorded History",
    reportingPeriod: "All Recorded History",
    generatedAt: "September 21, 2026, 2:15 AM",
    generatedBy: "Career Center Administrator",
    actorRole: "Career Center Admin",
    orientation: "portrait",
  },
  summaryStats: [
    { label: "Total Sessions", value: 5 },
    { label: "Interview Completers", value: 5 },
    { label: "Average Score", value: "84/100" },
    { label: "Resume Analyses", value: 12 },
  ],
  executiveSummary: {
    headline: "Recorded 5 completed interview simulations with cohort average of 84/100.",
    paragraphs: [
      "A total of 5 candidate students initiated the AIRIS technical interview simulation, with all 5 successfully completing the full questionnaire.",
      "The average score among completing candidates reflects strong technical grounding, with semantic correctness and delivery metrics recorded permanently in Firestore.",
    ],
    keyObservations: [
      "5 mock interview sessions completed.",
      "5 students finalized evaluations.",
      "Cohort mean interview evaluation: 84/100.",
    ],
  },
  visualizations: [
    {
      type: "horizontal_bars",
      title: "Interview Participation & Usage Metrics",
      subtitle: "Candidate interview attempts and finalized evaluation reports",
      metrics: [
        { label: "Students Attempting Interview", value: 5, max: 14, subtext: "36% of cohort", color: [30, 62, 107] },
        { label: "Students Finalizing Interview", value: 5, max: 14, subtext: "36% of cohort", color: [13, 148, 136] },
        { label: "Total Interview Sessions Conducted", value: 5, max: 5, color: [71, 85, 105] },
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
  ],
  tableData: {
    headers: ["Interview Metric", "Recorded Value", "Operational Context"],
    rows: [
      ["Total Completed Interview Sessions", 5, "Verified Firestore interview sessions"],
      ["Students Attempting Interviews", 5, "Candidates with at least 1 interview session"],
      ["Students Finalizing Interviews", 5, "Candidates receiving final interview reports"],
      ["Average Interview Score", "84/100", "Mean score across all completed interview sessions"],
      ["Total Resume Analyses Recorded", 12, "Verified resume evaluations in scope"],
    ],
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 32, halign: "center" },
      2: { cellWidth: 100 },
    },
  },
  definitions: [
    "Interview Session: Simulated voice / VR technical interview conducted by student candidate.",
    "Interview Score: Composite multi-factor evaluation across semantic correctness, clarity, and delivery.",
    "Completion Rate: Ratio of students completing interviews relative to registered eligible cohort.",
  ],
};

// 4. System Health Payload
const systemHealthPayload: ReportPayload = {
  key: "system_health",
  title: "System & Operational Health Audit Log",
  category: "OPERATIONAL HEALTH",
  question: "Are core platform systems, Firestore connections, and AI microservices healthy and responsive?",
  description:
    "Infrastructure telemetry, database availability status, AI scoring core responsiveness, and active user tallies.",
  metadata: {
    reportTitle: "System & Operational Health Audit Log",
    scopeDescription: "All Infrastructure Subsystems · Global Monitoring",
    reportingPeriod: "Real-Time Telemetry",
    generatedAt: "September 21, 2026, 2:15 AM",
    generatedBy: "Career Center Administrator",
    actorRole: "Career Center Admin",
    orientation: "portrait",
  },
  summaryStats: [
    { label: "Database", value: "OPERATIONAL" },
    { label: "AI Pipeline", value: "OPERATIONAL" },
    { label: "Server Connection", value: "OPERATIONAL" },
    { label: "Active Profiles", value: 14 },
  ],
  executiveSummary: {
    headline: "Core cloud database and administrative services are operational with 14 active student accounts.",
    paragraphs: [
      "Cloud Firestore connectivity is verified with real-time snapshot listeners active across candidate roster and evaluation subcollections.",
      "AI microservice readiness telemetry indicates current evaluation API endpoint availability on port 8000.",
    ],
    keyObservations: [
      "Database status: OPERATIONAL.",
      "AI Evaluator status: OPERATIONAL.",
      "Total active accounts: 14.",
    ],
  },
  visualizations: [
    {
      type: "telemetry_health",
      title: "Subsystem Telemetry Readiness Status",
      healthTelemetry: [
        {
          name: "Cloud Firestore Database",
          status: "operational",
          detail: "Authoritative collections sync, security rules, and real-time listeners active",
        },
        {
          name: "AIRIS SBERT AI Evaluator API",
          status: "operational",
          detail: "FastAPI semantic role alignment and deterministic scoring active on port 8000",
        },
        {
          name: "Live Web & Server Connection",
          status: "operational",
          detail: "Frontend application runtime and secure administrative session verified",
        },
      ],
    },
  ],
  tableData: {
    headers: ["Subsystem / Indicator", "Current Operational Status", "Technical Telemetry Context"],
    rows: [
      ["Cloud Firestore Database", "OPERATIONAL", "Cloud database connectivity and collection sync"],
      ["AIRIS SBERT AI Evaluator API", "OPERATIONAL", "FastAPI semantic alignment and LLM pipeline readiness"],
      ["Server Health", "OPERATIONAL", "Live server connection state"],
      ["Active Student Accounts", 14, "Current registered active student profiles in database"],
      ["Total Stored Resumes", 12, "Verified resume documents across accounts"],
      ["Total Stored Evaluations", 12, "Verified resume analyses recorded in Firestore"],
    ],
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 32, halign: "center" },
      2: { cellWidth: 104 },
    },
  },
  definitions: [
    "Operational Health: Real-time telemetry check across backend microservices and database.",
    "Tamper-Evident Security: Append-only event registry for access control and accountability.",
  ],
};

// 5. Security Audit Payload
const securityAuditPayload: ReportPayload = {
  key: "security_audit",
  title: "Administrative Security Audit Registry",
  category: "GOVERNANCE & AUDIT",
  question: "Who accessed or modified student data, toggled account states, or exported institutional reports?",
  description:
    "Immutable administrative event log capturing timestamps, authenticated actors, target student records, and action results.",
  metadata: {
    reportTitle: "Administrative Security Audit Registry",
    scopeDescription: "Administrative Access Ledger · Append-Only Security Trail",
    reportingPeriod: "All Recorded History",
    generatedAt: "September 21, 2026, 2:15 AM",
    generatedBy: "Career Center Administrator",
    actorRole: "Career Center Admin",
    orientation: "portrait",
  },
  summaryStats: [
    { label: "Total Audit Records", value: 36 },
    { label: "Successful Actions", value: 36 },
    { label: "Distinct Actors", value: 2 },
    { label: "Security Status", value: "Verified Log" },
  ],
  executiveSummary: {
    headline: "Recorded 36 administrative actions across 2 distinct authenticated actors with 36 verified successes.",
    paragraphs: [
      "Administrative events are captured append-only in Cloud Firestore with role-based access control enforced.",
      "The audit log verifies tamper-evident governance across report exports, profile state toggles, and coordinator assignments.",
    ],
    keyObservations: [
      "36 total events recorded in security ledger.",
      "36 operations concluded with SUCCESS result.",
      "Top action: ReportsGenerated (18 events).",
    ],
  },
  visualizations: [
    {
      type: "horizontal_bars",
      title: "Administrative Action Frequency Distribution",
      subtitle: "Top administrative operations executed within recorded audit trail",
      metrics: [
        { label: "ReportsGenerated", value: 18, max: 36, subtext: "50% of activity", color: [30, 62, 107] },
        { label: "StudentAccountUpdated", value: 10, max: 36, subtext: "28% of activity", color: [13, 148, 136] },
        { label: "UserSessionStarted", value: 6, max: 36, subtext: "17% of activity", color: [71, 85, 105] },
        { label: "CoordinatorAssigned", value: 2, max: 36, subtext: "5% of activity", color: [217, 119, 6] },
      ],
    },
    {
      type: "donut_breakdown",
      title: "Security Execution Success vs Failure",
      subtitle: "Ratio of successful administrative operations vs security rejections",
      donutData: [
        { label: "Successful Operations", count: 36, percentage: 100.0, colorHex: "#0D9488", colorRgb: [13, 148, 136] },
        { label: "Failed / Rejected", count: 0, percentage: 0.0, colorHex: "#E11D48", colorRgb: [225, 29, 72] },
      ],
    },
  ],
  tableData: {
    headers: ["Timestamp", "Actor (Role)", "Action", "Target", "Result", "Event Details"],
    rows: [
      ["2026-09-21 02:10", "Career Center Admin (career_center)", "ReportsGenerated", "StudentProfilesReport", "SUCCESS", "Exported PDF Student Profiles Report (14 students)."],
      ["2026-09-21 02:08", "Career Center Admin (career_center)", "ReportsGenerated", "CompletionFunnelReport", "SUCCESS", "Exported PDF Completion Funnel Report."],
      ["2026-09-21 01:55", "OJT Coordinator (ojt_coordinator)", "StudentAccountUpdated", "Daniel Tan", "SUCCESS", "Verified OJT eligibility status."],
      ["2026-09-21 01:40", "Career Center Admin (career_center)", "ReportsGenerated", "InterviewUsageReport", "SUCCESS", "Exported PDF Interview Usage Report."],
      ["2026-09-20 23:15", "Career Center Admin (career_center)", "ReportsGenerated", "SystemHealthReport", "SUCCESS", "Exported PDF System Health Report."],
      ["2026-09-20 22:50", "Career Center Admin (career_center)", "ReportsGenerated", "AuditTrailReport", "SUCCESS", "Exported PDF Security Audit Trail (36 entries)."],
      ["2026-09-20 21:30", "OJT Coordinator (ojt_coordinator)", "CoordinatorAssigned", "Carlos Reyes", "SUCCESS", "Assigned coordinator to BSIT candidate."],
      ["2026-09-20 20:10", "Career Center Admin (career_center)", "UserSessionStarted", "AdminConsole", "SUCCESS", "Authenticated administrative session initiated."],
    ],
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 38 },
      2: { cellWidth: 28 },
      3: { cellWidth: 26 },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 48 },
    },
  },
  definitions: [
    "Security Audit Trail: Immutable append-only audit event log tracking all administrative actions.",
    "Role Verification: Enforced through Firebase security rules and custom claims.",
  ],
};

const allReports = [
  studentProfilesPayload,
  completionFunnelPayload,
  interviewUsagePayload,
  systemHealthPayload,
  securityAuditPayload,
];

for (const report of allReports) {
  const pdfPath = path.join(outDir, `${report.key}.pdf`);
  console.log(`Generating PDF for ${report.key} -> ${pdfPath}`);
  generateProfessionalPdf(report, pdfPath);
}

console.log("All 5 reports generated successfully!");
