"use client";

import React, { useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { downloadStudentsReport, downloadAuditLogsReport } from "../../services/firebase/reportService";
import { FileSpreadsheet, Download, ShieldAlert } from "lucide-react";

export default function ReportsPage() {
  const { currentAdmin } = useAuthStore();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (reportType: "students" | "audit") => {
    if (!currentAdmin) return;
    setDownloading(reportType);
    try {
      if (reportType === "students") {
        await downloadStudentsReport(currentAdmin.fullName);
      } else {
        await downloadAuditLogsReport(currentAdmin.fullName);
      }
    } catch {
      alert("Failed to compile or download report data.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        <div>
          <h1 className="text-2xl font-black tracking-tight">System Reports</h1>
          <p className="text-xs font-bold text-brand-slate mt-0.5">Export registered student metrics and security audit logs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Students Report */}
          <div className="figma-card p-6 bg-white flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-2xl w-fit text-blue-600">
                <FileSpreadsheet size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-[#1E3E6B]">Student Profiles & Performance</h3>
              <p className="text-xs font-medium text-brand-slate leading-relaxed">
                Generates a comprehensive CSV spreadsheet listing student names, TIP emails, campus divisions, degree programs, date registered, and overall resume employability scores.
              </p>
            </div>
            <button
              onClick={() => handleDownload("students")}
              disabled={!!downloading}
              className="figma-btn text-xs py-3 mt-4"
            >
              {downloading === "students" ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <Download size={14} />
                  Download CSV
                </>
              )}
            </button>
          </div>

          {/* Audit Logs Report */}
          <div className="figma-card p-6 bg-white flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-2xl w-fit text-amber-600">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-[#1E3E6B]">Security Audit Log Registry</h3>
              <p className="text-xs font-medium text-brand-slate leading-relaxed">
                Generates a security compliance report listing administrator sign-ins, logouts, student profile creations, updates, and profile deletions with exact timestamps.
              </p>
            </div>
            <button
              onClick={() => handleDownload("audit")}
              disabled={!!downloading}
              className="figma-btn text-xs py-3 mt-4"
            >
              {downloading === "audit" ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <Download size={14} />
                  Download CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
