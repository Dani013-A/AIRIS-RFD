"use client";

import React, { useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useAuthStore } from "../../store/authStore";
import {
  downloadStudentsReport,
  downloadPerformanceHistoryReport,
  downloadInterviewUsageReport,
  downloadSystemHealthReport,
  downloadAuditLogsReport,
} from "../../services/firebase/reportService";
import {
  FileSpreadsheet,
  Download,
  Users,
  TrendingUp,
  Activity,
  ShieldAlert,
  Server,
  CheckCircle2,
} from "lucide-react";

export default function ReportsPage() {
  const { currentAdmin } = useAuthStore();
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDownload = async (
    reportKey: string,
    downloadFn: (adminName: string) => Promise<void>,
    reportName: string
  ) => {
    const adminName = currentAdmin?.fullName || "Administrator";
    setDownloadingReport(reportKey);
    setSuccessMessage(null);

    try {
      await downloadFn(adminName);
      setSuccessMessage(`Successfully compiled and downloaded "${reportName}".`);
    } catch (err: any) {
      alert(`Failed to export report: ${err.message || "Unknown error"}`);
    } finally {
      setDownloadingReport(null);
    }
  };

  const reportsList = [
    {
      key: "students_profile",
      title: "Student Profiles & Performance Snapshot",
      useCase: "Use for institutional accreditation, student roster audits, and academic program performance reviews.",
      description: "Exports User IDs, TIP emails, college domains, degree programs, target careers, registration dates, latest ATS scores, interview scores, and overall employability index.",
      icon: Users,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      downloadFn: downloadStudentsReport,
    },
    {
      key: "performance_history",
      title: "Student Performance Improvement History",
      useCase: "Use to evaluate student score progression over time across resume versions and mock interview attempts.",
      description: "Exports itemized evaluation sessions with exact score deltas calculated strictly within the same metric (e.g. Resume ATS or Interview score).",
      icon: TrendingUp,
      iconColor: "text-teal-600",
      bgColor: "bg-teal-50",
      downloadFn: downloadPerformanceHistoryReport,
    },
    {
      key: "interview_usage",
      title: "Interview Usage & Participation Metrics",
      useCase: "Use to track student adoption, interview participation rates, and AI feedback generation volumes.",
      description: "Exports aggregate participation rates across degree programs, total mock interviews completed, and total document parses recorded.",
      icon: Activity,
      iconColor: "text-orange-600",
      bgColor: "bg-orange-50",
      downloadFn: downloadInterviewUsageReport,
    },
    {
      key: "system_health",
      title: "System & Operational Health Log",
      useCase: "Use for technical system audits, database connectivity verification, and active service checks.",
      description: "Exports Firestore connectivity status, AI core readiness, active user counts, and system telemetry timestamps.",
      icon: Server,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-50",
      downloadFn: downloadSystemHealthReport,
    },
    {
      key: "security_audit",
      title: "Security Audit Log Registry",
      useCase: "Use for administrative access reviews, security compliance audits, and account state modification tracking.",
      description: "Exports logged security events including admin sign-ins, account status changes, profile deletions, and report export activities.",
      icon: ShieldAlert,
      iconColor: "text-red-600",
      bgColor: "bg-red-50",
      downloadFn: downloadAuditLogsReport,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 text-[#1E3E6B]">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black tracking-tight">Institutional Reports & Data Exports</h1>
          <p className="text-sm font-semibold text-brand-slate mt-0.5">
            Download verified CSV reports for campus administration, student performance audits, and compliance registry.
          </p>
        </div>

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2">
            <CheckCircle2 size={18} />
            {successMessage}
          </div>
        )}

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reportsList.map((report) => {
            const Icon = report.icon;
            const isDownloading = downloadingReport === report.key;

            return (
              <div
                key={report.key}
                className="figma-card p-6 bg-white flex flex-col justify-between space-y-4 border border-gray-200 hover:shadow-sm transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3.5">
                    <div className={`h-11 w-11 rounded-2xl ${report.bgColor} ${report.iconColor} flex items-center justify-center shrink-0`}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-[#1E3E6B] leading-tight">{report.title}</h2>
                      <span className="text-[11px] font-extrabold text-brand-primary block mt-0.5">{report.useCase}</span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-brand-slate leading-relaxed pt-1">
                    {report.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold text-brand-slate flex items-center gap-1.5">
                    <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" /> CSV Format
                  </span>
                  <button
                    onClick={() => handleDownload(report.key, report.downloadFn, report.title)}
                    disabled={isDownloading}
                    className="px-4 py-2.5 rounded-xl bg-brand-primary text-xs font-black hover:bg-brand-primary/90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs border border-emerald-600 text-emerald-600"
                  >
                    <Download size={15} />
                    {isDownloading ? "Generating CSV..." : "Download CSV"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
