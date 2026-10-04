"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "../../../components/layouts/DashboardLayout";
import { useAuthStore } from "../../../store/authStore";
import { fetchReportPayload, triggerFileDownload } from "../../../services/firebase/reportService";
import { generateProfessionalPdf } from "../../../services/reports/pdfReportGenerator";
import { ReportFilterScope, ReportPayload, ReportType } from "../../../types/report.types";
import { TIP_MANILA_COORDINATORS, getCoordinatorById } from "../../../config/tipManilaAcademic";
import { Select } from "../../../components/ui/Select";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import {
  FileText,
  FileSpreadsheet,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  Users,
  Server,
  ShieldCheck,
  Info,
} from "lucide-react";

function ReportDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { currentAdmin } = useAuthStore();

  const reportKey = (params?.id as ReportType) || "student_profiles";

  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const urlCoordinator = getCoordinatorById(searchParams.get("coordinator") || searchParams.get("college") || "all")?.id || "all";
  const urlPeriod = (searchParams.get("period") as ReportFilterScope["period"]) || "all";

  const [scope, setScope] = useState<ReportFilterScope>({
    coordinator: urlCoordinator,
    period: urlPeriod,
  });

  // Load authoritative payload
  const loadPayload = async () => {
    if (!currentAdmin) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchReportPayload(reportKey, currentAdmin, scope);
      setPayload(res);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Failed to load authoritative report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayload();
  }, [reportKey, currentAdmin, scope.coordinator, scope.period]);

  // Scope filter change handler
  const handleScopeChange = (updated: Partial<ReportFilterScope>) => {
    const newScope = { ...scope, ...updated };
    setScope(newScope);

    // Update query params
    const q = new URLSearchParams();
    if (newScope.coordinator && newScope.coordinator !== "all") q.set("coordinator", newScope.coordinator);
    if (newScope.period && newScope.period !== "all") q.set("period", newScope.period);
    router.replace(`/reports/${reportKey}?${q.toString()}`);
  };

  // PDF Export
  const handleExportPdf = async () => {
    if (!payload) return;
    setExportingPdf(true);
    try {
      const fileName = `AIRIS_${reportKey}_${Date.now()}.pdf`;
      generateProfessionalPdf(payload, fileName);
    } catch (err: any) {
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setExportingPdf(false);
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    if (!payload) return;
    setExportingCsv(true);
    try {
      const fileName = `AIRIS_${reportKey}_${Date.now()}.csv`;
      triggerFileDownload(payload.rawCsvData || "", fileName);
    } catch (err: any) {
      alert(`Failed to export CSV: ${err.message}`);
    } finally {
      setExportingCsv(false);
    }
  };

  // Filtered table rows based on live search
  const filteredRows = useMemo(() => {
    if (!payload) return [];
    if (!tableSearch.trim()) return payload.tableData.rows;
    const query = tableSearch.toLowerCase();
    return payload.tableData.rows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(query))
    );
  }, [payload, tableSearch]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        {/* Navigation Breadcrumb & Back */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-[#1E3E6B] hover:text-[#0D9488] transition-colors"
            >
              <ArrowLeft size={14} /> Back to Reports Suite
            </Link>
            <span>/</span>
            <span className="text-gray-400 uppercase tracking-wider">{payload?.category || "REPORT"}</span>
          </div>

          {/* Primary Action Bar: Dominant Institutional PDF & Secondary CSV */}
          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center lg:w-auto">
            <button
              onClick={handleExportPdf}
              disabled={loading || exportingPdf || !payload}
              aria-label="Download Institutional PDF"
              className="inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3E6B] text-white text-xs font-black hover:bg-[#152e50] shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              <FileText size={15} />
              <span>{exportingPdf ? "Compiling PDF..." : "Download Institutional PDF"}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={loading || exportingCsv || !payload}
              aria-label="Export Raw CSV"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-[#1E3E6B] text-xs font-bold hover:bg-gray-50 hover:border-gray-400 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              <FileSpreadsheet size={15} className="text-emerald-700" />
              <span>{exportingCsv ? "Exporting..." : "Export CSV"}</span>
            </button>
          </div>
        </div>

        {/* Title and Analytical Research Question */}
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#1E3E6B]">
            {payload?.title || "Report Workspace"}
          </h1>
          <p className="text-xs md:text-sm font-semibold text-gray-600 mt-1">
            {payload?.question || "Authoritative Institutional Evaluation & Analytics"}
          </p>
        </div>

        {/* Dependent Scope Filter Toolbar */}
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
                aria-label="Filter by Period"
              >
                <option value="all">All Recorded History</option>
                <option value="7d">Past 7 Days</option>
                <option value="30d">Past 30 Days</option>
                <option value="90d">Past 90 Days</option>
                <option value="1y">Past 1 Year</option>
              </Select>
            </div>
          </div>

          <div className="text-[11px] font-bold text-gray-500">
            {payload?.metadata.scopeDescription}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-gray-200">
            <LoadingSpinner size="lg" />
            <span className="text-xs font-bold text-gray-500">
              Querying authoritative Firestore datasets...
            </span>
          </div>
        ) : payload ? (
          <>
            {/* Executive Summary Card */}
            <div className="p-6 bg-white rounded-xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-150 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#1E3E6B] flex items-center gap-1.5">
                  <Info size={15} className="text-[#0D9488]" /> Executive Summary & Institutional Findings
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  Authoritative Verified Data
                </span>
              </div>

              <div>
                <h2 className="text-base font-black text-[#1E3E6B]">
                  {payload.executiveSummary.headline}
                </h2>
                <div className="space-y-2 mt-2 text-xs text-gray-700 leading-relaxed">
                  {payload.executiveSummary.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </div>

              {payload.executiveSummary.keyObservations.length > 0 && (
                <div className="p-3.5 bg-gray-50/80 rounded-lg border border-gray-200 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                    Key Observations:
                  </span>
                  <ul className="space-y-1 text-xs text-gray-700">
                    {payload.executiveSummary.keyObservations.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#0D9488] font-black mt-0.5">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Summary Stat Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {payload.summaryStats.map((st, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white rounded-xl border border-gray-200 space-y-1 shadow-sm"
                >
                  <span className="text-[11px] font-bold text-gray-500 block uppercase tracking-wider">
                    {st.label}
                  </span>
                  <div className="text-2xl font-black text-[#1E3E6B]">{st.value}</div>
                </div>
              ))}
            </div>

            {/* Interactive Analytical Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {payload.visualizations.map((viz, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-white rounded-xl border border-gray-200 space-y-4 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-1 border-b border-gray-150 pb-3">
                    <h3 className="text-sm font-black text-[#1E3E6B] uppercase tracking-wide">
                      {viz.title}
                    </h3>
                    {viz.subtitle && (
                      <p className="text-xs text-gray-500">{viz.subtitle}</p>
                    )}
                  </div>

                  {/* 1. Donut Breakdown (SVG Render) */}
                  {viz.type === "donut_breakdown" && viz.donutData && (
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                      <div className="relative w-36 h-36 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          {(() => {
                            const total = viz.donutData.reduce((acc, d) => acc + d.count, 0);
                            let accumulatedPercent = 0;

                            return viz.donutData.map((d, dIdx) => {
                              const percent = total > 0 ? (d.count / total) * 100 : 0;
                              const strokeDasharray = `${percent} ${100 - percent}`;
                              const strokeDashoffset = -accumulatedPercent;
                              accumulatedPercent += percent;

                              return (
                                <circle
                                  key={dIdx}
                                  cx="50"
                                  cy="50"
                                  r="35"
                                  fill="transparent"
                                  stroke={d.colorHex || "#1E3E6B"}
                                  strokeWidth="18"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  pathLength="100"
                                  className="transition-all duration-300 hover:opacity-80"
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-base font-black text-[#1E3E6B]">
                            {viz.donutData.reduce((acc, d) => acc + d.count, 0)}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase">Total</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-2 w-full sm:w-auto">
                        {viz.donutData.map((item, dIdx) => (
                          <div key={dIdx} className="flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded shrink-0"
                                style={{ backgroundColor: item.colorHex || "#1E3E6B" }}
                              />
                              <span className="font-semibold text-gray-700">{item.label}</span>
                            </div>
                            <span className="font-bold text-[#1E3E6B]">
                              {item.count} ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Funnel Pipeline */}
                  {viz.type === "funnel_pipeline" && viz.funnelStages && (
                    <div className="space-y-3 py-1">
                      {viz.funnelStages.map((st, sIdx) => (
                        <div key={sIdx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#1E3E6B]">
                              {st.stageNumber}. {st.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-[#1E3E6B]">
                                {st.count} ({st.percentage.toFixed(1)}%)
                              </span>
                              {st.dropOff !== undefined && st.dropOff > 0 && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                  -{st.dropOff}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(3, Math.min(100, st.percentage))}%`,
                                backgroundColor:
                                  st.label.toLowerCase().includes("prepared") ||
                                  st.label.toLowerCase().includes("ready")
                                    ? "#0D9488"
                                    : "#1E3E6B",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 block truncate">
                            {st.meaning}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. Score Distribution */}
                  {viz.type === "score_distribution" && viz.scoreDistribution && (
                    <div className="space-y-3 py-1">
                      {viz.scoreDistribution.tiers.map((tier, tIdx) => {
                        const maxTier = Math.max(
                          ...viz.scoreDistribution!.tiers.map((t) => t.count),
                          1
                        );
                        return (
                          <div key={tIdx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#1E3E6B]">
                                {tier.range} ({tier.label})
                              </span>
                              <span className="font-bold text-[#1E3E6B]">
                                {tier.count} students ({tier.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(2, (tier.count / maxTier) * 100)}%`,
                                  backgroundColor:
                                    tIdx === 0
                                      ? "#0D9488"
                                      : tIdx === 1
                                      ? "#1E3E6B"
                                      : tIdx === 2
                                      ? "#475569"
                                      : tIdx === 3
                                      ? "#E11D48"
                                      : "#94A3B8",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 4. Horizontal Bars */}
                  {viz.type === "horizontal_bars" && viz.metrics && (
                    <div className="space-y-3 py-1">
                      {viz.metrics.map((m, mIdx) => (
                        <div key={mIdx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#1E3E6B]">{m.label}</span>
                            <span className="font-black text-[#1E3E6B]">
                              {m.subtext ? `${m.value} (${m.subtext})` : m.value}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(3, (m.value / (m.max || 1)) * 100)}%`,
                                backgroundColor:
                                  m.label.toLowerCase().includes("prepared")
                                    ? "#0D9488"
                                    : "#1E3E6B",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 5. Health Telemetry */}
                  {viz.type === "telemetry_health" && viz.healthTelemetry && (
                    <div className="space-y-2.5 py-1">
                      {viz.healthTelemetry.map((item, hIdx) => {
                        const isOp = item.status === "operational";
                        const isDeg = item.status === "degraded";
                        return (
                          <div
                            key={hIdx}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  isOp
                                    ? "bg-emerald-600"
                                    : isDeg
                                    ? "bg-amber-500"
                                    : "bg-rose-600"
                                }`}
                              />
                              <div>
                                <span className="font-extrabold text-[#1E3E6B] block">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-gray-500 block">
                                  {item.detail}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                isOp
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : isDeg
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 6. Trend Line / Intentional Low Data State (Amendment 4) */}
                  {viz.type === "trend_line" && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center space-y-1">
                      <p className="text-xs font-semibold text-gray-600">
                        {viz.insufficientDataNote ||
                          "Trend unavailable for the selected period because insufficient historical observations are available."}
                      </p>
                      <span className="text-[10px] text-gray-400 block">
                        Strict Data Integrity: No synthetic historical observations are manufactured.
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Authoritative Data Table */}
            <div className="p-6 bg-white rounded-xl border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-[#1E3E6B]">
                    Detailed Report Records ({filteredRows.length} total)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live tabular presentation matching the formal institutional PDF export
                  </p>
                </div>

                {/* Table Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search records in table..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:border-[#1E3E6B]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1E3E6B] text-white font-bold">
                      {payload.tableData.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-3 font-extrabold tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {paginatedRows.length > 0 ? (
                      paginatedRows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={rIdx % 2 === 0 ? "bg-white hover:bg-gray-50/80" : "bg-gray-50/50 hover:bg-gray-100/50"}
                        >
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-3 text-gray-800">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={payload.tableData.headers.length}
                          className="p-8 text-center text-gray-500 italic"
                        >
                          No records found matching the specified search or report scope.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                  <span>
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}{" "}
                    records
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="font-bold text-[#1E3E6B] px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Official Definitions Card */}
            {payload.definitions.length > 0 && (
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#1E3E6B] block">
                  Official Metric & Methodological Definitions
                </span>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  {payload.definitions.map((def, defIdx) => (
                    <li key={defIdx} className="flex items-start gap-2">
                      <span className="text-gray-400 font-bold">•</span>
                      <span>{def}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default function ReportDetailPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      }
    >
      <ReportDetailContent />
    </Suspense>
  );
}
