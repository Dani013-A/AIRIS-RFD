import { fetchStudentsList } from "./userService";
import { fetchAuditLogs } from "./auditService";
import { logAuditEvent } from "./auditService";

/**
 * Downloads a text file (CSV format) directly inside the browser.
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
 * Compiles a CSV formatted file of all registered students.
 */
export async function downloadStudentsReport(adminName: string): Promise<void> {
  const students = await fetchStudentsList();

  const headers = [
    "Student ID",
    "Full Name",
    "Email Address",
    "College",
    "Degree Program",
    "Date Joined",
    "Employability Score",
    "Resume Status",
    "Account Status",
  ];

  const rows = students.map((s) => [
    s.uid,
    `"${s.fullName.replace(/"/g, '""')}"`,
    s.email,
    s.college,
    s.degreeProgram,
    s.createdAt,
    s.employabilityScore,
    s.resumeStatus,
    s.isDisabled ? "Disabled" : "Active",
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerFileDownload(csvContent, `AIRIS_Students_Report_${Date.now()}.csv`);

  await logAuditEvent("ReportsGenerated", "Downloaded Student Profiles Activity CSV Report", adminName);
}

/**
 * Compiles a CSV formatted file of audit logs.
 */
export async function downloadAuditLogsReport(adminName: string): Promise<void> {
  const logs = await fetchAuditLogs(100);

  const headers = ["Log ID", "Action", "Details", "Performed By", "Timestamp"];

  const rows = logs.map((l) => [
    l.id,
    l.action,
    `"${l.details.replace(/"/g, '""')}"`,
    l.performedBy,
    l.timestamp,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerFileDownload(csvContent, `AIRIS_Audit_Logs_${Date.now()}.csv`);

  await logAuditEvent("ReportsGenerated", "Downloaded System Security Audit Logs Report", adminName);
}
