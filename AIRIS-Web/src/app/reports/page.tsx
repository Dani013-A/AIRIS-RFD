"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useAuthStore } from "../../store/authStore";
import { useDashboardStore } from "../../store/dashboardStore";
import { Select } from "../../components/ui/Select";
import { exportReport } from "../../services/firebase/reportService";
import { ReportFilterScope, ReportType } from "../../types/report.types";
import { TIP_MANILA_COORDINATORS, getCoordinatorById } from "../../config/tipManilaAcademic";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  Users,
  TrendingUp,
  Activity,
  HeartPulse,
  ShieldCheck,
  ShieldAlert,
  Server,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentAdmin } = useAuthStore();
  const { metrics, loadDashboardData } = useDashboardStore();
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const urlCoordinator = getCoordinatorById(searchParams.get("coordinator") || searchParams.get("college") || "all")?.id || "all";
  const urlPeriod = (searchParams.get("period") as ReportFilterScope["period"]) || "all";

  // Normalize obsolete dataset URL parameter if present
  useEffect(() => {
    if (searchParams.has("dataset")) {
      const q = new URLSearchParams(searchParams.toString());
      q.delete("dataset");
      router.replace(`/reports?${q.toString()}`);
    }
  }, [searchParams, router]);

  const [scope, setScope] = useState<ReportFilterScope>({
    coordinator: urlCoordinator,
    period: urlPeriod,
    datasetScope: "all",
  });

  // Keep dashboard metrics synced for the report preview cards
  useEffect(() => {
    loadDashboardData(
      {
        coordinator: scope.coordinator,
        period: scope.period as any,
        datasetScope: "all",
      },
      currentAdmin?.role
    );
  }, [
    scope.coordinator,
    scope.period,
    currentAdmin?.role,
    loadDashboardData,
  ]);

  const handleScopeChange = (updated: Partial<ReportFilterScope>) => {
    const newScope: ReportFilterScope = { ...scope, ...updated, datasetScope: "all" };
    setScope(newScope);

    const q = new URLSearchParams();
    if (newScope.coordinator && newScope.coordinator !== "all") q.set("coordinator", newScope.coordinator);
    if (newScope.period && newScope.period !== "all") q.set("period", newScope.period);
    router.replace(`/reports?${q.toString()}`);
  };

  const handleSubordinateQuickExport = async (
    key: ReportType,
    format: "pdf" | "csv",
    reportTitle: string
  ) => {
    if (!currentAdmin) return;
    const downloadId = `${key}_${format}`;
    setDownloadingKey(downloadId);
    setSuccessMessage(null);

    try {
      await exportReport(key, currentAdmin, format, scope);
      setSuccessMessage(`Successfully generated "${reportTitle}" (${format.toUpperCase()}).`);
    } catch (err: any) {
      alert(`Failed to export report: ${err.message || "Unknown error"}`);
    } finally {
      setDownloadingKey(null);
    }
  };

  const funnel = metrics?.funnel || {
    registeredCount: 0,
    resumeUploadedCount: 0,
    resumeAnalyzedCount: 0,
    interviewStartedCount: 0,
    interviewCompletedCount: 0,
    fullyPreparedCount: 0,
    completionRate: 0,
  };

  const formatScopeLabel = () => {
    const coordObj =
      scope.coordinator && scope.coordinator !== "all"
        ? getCoordinatorById(scope.coordinator)
        : undefined;
    const coordStr = coordObj ? coordObj.name : "All Coordinators";
    const periodStr =
      scope.period && scope.period !== "all"
        ? `Past ${scope.period.toUpperCase()}`
        : "All Recorded History";

    return `${coordStr} · ${periodStr} · All Participants`;
  };

  const buildReportViewHref = (key: string) => {
    const q = new URLSearchParams();
    if (scope.coordinator && scope.coordinator !== "all") q.set("coordinator", scope.coordinator);
    if (scope.period && scope.period !== "all") q.set("period", scope.period);
    const qs = q.toString();
    return `/reports/${key}${qs ? `?${qs}` : ""}`;
  };

  const reportsList: Array<{
    key: ReportType;
    category: string;
    title: string;
    question: string;
    description: string;
    icon: any;
    preview: Array<{ label: string; value: string | number }>;
  }> = [
    {
      key: "student_profiles",
      category: "STUDENT PERFORMANCE",
      title: "Student Profiles & Employability Preparedness",
      question: "Which students are enrolled and how prepared are they across evaluations?",
      description:
        "Student roster, institutional email, degree program, latest ATS resume evaluation, mock interview performance, and composite employability status.",
      icon: Users,
      preview: [
        { label: "Registered", value: funnel.registeredCount },
        { label: "Resume Analyzed", value: funnel.resumeAnalyzedCount },
        { label: "Interview Done", value: funnel.interviewCompletedCount },
        { label: "Fully Prepared", value: funnel.fullyPreparedCount },
      ],
    },
    {
      key: "completion_funnel",
      category: "CAREER CENTER MOM FUNNEL",
      title: "Career Center Completion Pipeline",
      question: "How far have students progressed through the 6-stage preparation funnel and where is the drop-off?",
      description:
        "Stage-by-stage progression from initial registration to fully prepared status, tracking drop-offs and stage conversion rates.",
      icon: TrendingUp,
      preview: [
        { label: "Participants", value: funnel.registeredCount },
        { label: "Resumes", value: funnel.resumeUploadedCount },
        { label: "Interviews", value: funnel.interviewCompletedCount },
        { label: "Prepared Rate", value: `${funnel.completionRate}%` },
      ],
    },
    {
      key: "interview_usage",
      category: "INTERVIEW ANALYTICS",
      title: "Mock Interview Participation & Usage",
      question: "How frequently are students utilizing voice interview simulations and what are their category scores?",
      description:
        "Aggregate session volumes, category evaluations (Semantic Correctness, AI Holistic, Clarity), and completion metrics.",
      icon: Activity,
      preview: [
        { label: "Sessions Held", value: metrics?.totalInterviewsConducted ?? 0 },
        {
          label: "Avg Interview",
          value:
            metrics?.performanceSummary?.avgInterviewScore !== null &&
            metrics?.performanceSummary?.avgInterviewScore !== undefined
              ? `${metrics.performanceSummary.avgInterviewScore}/100`
              : "N/A",
        },
        { label: "Prepared", value: funnel.fullyPreparedCount },
      ],
    },
    {
      key: "system_health",
      category: "OPERATIONAL HEALTH",
      title: "System & Operational Telemetry Log",
      question: "Are core platform systems, Firestore connections, and AI microservices healthy and responsive?",
      description:
        "Infrastructure telemetry, database availability status, AI scoring core responsiveness, and active user tallies.",
      icon: Server,
      preview: [
        { label: "Firestore", value: "Online" },
        { label: "AI Scoring", value: "Active" },
        { label: "Audit Log", value: "Active" },
      ],
    },
    {
      key: "security_audit",
      category: "GOVERNANCE & AUDIT",
      title: "Administrative Security Audit Registry",
      question: "Who accessed or modified student data, toggled account states, or exported institutional reports?",
      description:
        "Immutable administrative event log capturing timestamps, authenticated actors, target student records, and action results.",
      icon: ShieldAlert,
      preview: [
        { label: "Actor Attribution", value: "Active" },
        { label: "Protected Logging", value: "Active" },
        { label: "Retention", value: "Permanent" },
      ],
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#1E3E6B]">
            Institutional Reports Suite
          </h1>
          <p className="text-xs md:text-sm font-semibold text-gray-500 mt-0.5">
            T.I.P. Career Center official analytics. Select a report to explore interactive analytical findings, review methodology, and generate formal institutional PDFs.
          </p>
        </div>

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dependent Academic Scope Selection Toolbar */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-600">
            <div className="flex items-center gap-1.5 text-[#1E3E6B] font-black uppercase tracking-wider">
              <Filter size={14} /> Scope Filter:
            </div>

            {/* Coordinator (Renamed from College - OJT Coordinators assigned to departments/colleges) */}
            <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 xl:w-auto">
              <span className="font-semibold text-gray-500">Coordinator:</span>
              <Select
                value={scope.coordinator || "all"}
                onChange={(e) => handleScopeChange({ coordinator: e.target.value })}
                aria-label="Filter by Coordinator"
              >
                <option value="all">All Coordinators</option>
                {TIP_MANILA_COORDINATORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName}
                  </option>
                ))}
              </Select>
            </div>

            {/* Period */}
            <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 xl:w-auto">
              <span className="font-semibold text-gray-500">Period:</span>
              <Select
                value={scope.period || "all"}
                onChange={(e) =>
                  handleScopeChange({ period: e.target.value as ReportFilterScope["period"] })
                }
                aria-label="Select reporting period"
              >
                <option value="all">All Recorded History</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
                <option value="90d">Past 90 Days</option>
                <option value="1y">Past 1 Year</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Report Cards Grid with Dominant [ View Report ] Action (Amendment 6) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {reportsList.map((report) => {
            const Icon = report.icon;
            const isDownloadingPdf = downloadingKey === `${report.key}_pdf`;
            const isDownloadingCsv = downloadingKey === `${report.key}_csv`;

            return (
              <div
                key={report.key}
                className="p-5 bg-white rounded-xl border border-gray-200 flex flex-col justify-between space-y-4 hover:border-gray-300 transition-colors shadow-sm"
              >
                {/* Header & Meta */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      {report.category}
                    </span>
                    <Icon size={18} className="text-[#1E3E6B]" />
                  </div>

                  <div>
                    <h2 className="text-base font-extrabold text-[#1E3E6B] leading-snug">
                      {report.title}
                    </h2>
                    <p className="text-xs font-bold text-gray-600 mt-0.5">
                      {report.question}
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    {report.description}
                  </p>

                  {/* Compact Live Data Preview */}
                  <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-200 mt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                      Current Scope Preview
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                      {report.preview.map((p, pIdx) => (
                        <div key={pIdx} className="space-y-0.5">
                          <span className="text-[10px] text-gray-500 block truncate">{p.label}</span>
                          <span className="font-extrabold text-[#1E3E6B] text-xs block truncate">
                            {p.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dominant [ View Report ] Action Bar (Amendment 6 & 7) */}
                <div className="pt-3 border-t border-gray-150 flex flex-col gap-2">
                  <div className="text-[11px] font-medium text-gray-500 truncate">
                    <span className="font-bold text-gray-700">Scope: </span>
                    <span className="text-[#1E3E6B] font-bold">{formatScopeLabel()}</span>
                  </div>

                  <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                    {/* Dominant Action: View Report */}
                    <Link
                      href={buildReportViewHref(report.key)}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-lg bg-[#1E3E6B] text-white text-xs font-black hover:bg-[#152e50] shadow-sm transition-colors cursor-pointer"
                    >
                      <span>View Report</span>
                      <ArrowRight size={14} />
                    </Link>

                    {/* Subordinate Quick PDF Export Icon */}
                    <button
                      onClick={() => handleSubordinateQuickExport(report.key, "pdf", report.title)}
                      disabled={isDownloadingPdf || isDownloadingCsv}
                      title="Quick Download Institutional PDF"
                      aria-label={`Quick Download PDF for ${report.title}`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-[#1E3E6B] hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <FileText size={14} />
                    </button>

                    {/* Subordinate Quick CSV Export Icon */}
                    <button
                      onClick={() => handleSubordinateQuickExport(report.key, "csv", report.title)}
                      disabled={isDownloadingPdf || isDownloadingCsv}
                      title="Quick Export Raw CSV"
                      aria-label={`Quick Export CSV for ${report.title}`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-emerald-700 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="py-24 flex items-center justify-center">
            <div className="text-xs font-bold text-gray-500">Loading Reports Suite...</div>
          </div>
        </DashboardLayout>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
