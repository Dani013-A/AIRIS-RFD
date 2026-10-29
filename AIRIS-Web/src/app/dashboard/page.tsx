"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useDashboardStore } from "../../store/dashboardStore";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Select } from "../../components/ui/Select";
import { AnalyticsFilterParams } from "../../types/analytics.types";
import { TIP_MANILA_COORDINATORS, getCoordinatorById } from "../../config/tipManilaAcademic";
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Award,
  Clock,
  ShieldCheck,
  Server,
  Database,
  Filter,
  RotateCcw,
  Radio,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const { currentAdmin } = useAuthStore();
  const { metrics, health, loading, error, activeFilters, setFilters, loadDashboardData } =
    useDashboardStore();

  const [hoveredPoint, setHoveredPoint] = useState<{
    month: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Synchronize state with URL query parameters
  useEffect(() => {
    const urlCoordinator = searchParams.get("coordinator") || searchParams.get("college") || undefined;
    const urlPeriod = (searchParams.get("period") as AnalyticsFilterParams["period"]) || undefined;

    // Normalize obsolete dataset URL parameter if present
    if (searchParams.has("dataset")) {
      const cleanParams = new URLSearchParams(searchParams.toString());
      cleanParams.delete("dataset");
      router.replace(`${pathname}?${cleanParams.toString()}`);
    }

    const newFilters: AnalyticsFilterParams = {
      coordinator: getCoordinatorById(urlCoordinator || "all")?.id || "all",
      period: urlPeriod || "all",
      datasetScope: "all",
    };

    setFilters(newFilters);
    loadDashboardData(newFilters, currentAdmin?.role);
  }, [
    searchParams,
    currentAdmin?.role,
    currentAdmin?.uid,
    setFilters,
    loadDashboardData,
    pathname,
    router,
  ]);

  const updateFiltersInUrl = (updated: Partial<AnalyticsFilterParams>) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updated.coordinator !== undefined) {
      if (updated.coordinator === "all") params.delete("coordinator");
      else params.set("coordinator", updated.coordinator);
    }

    if (updated.period !== undefined) {
      if (updated.period === "all") params.delete("period");
      else params.set("period", updated.period);
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    const resetFilters: Partial<AnalyticsFilterParams> = {
      coordinator: "all",
      period: "all",
      datasetScope: "all",
    };
    updateFiltersInUrl(resetFilters);
  };

  const hasActiveFilters =
    (activeFilters.coordinator && activeFilters.coordinator !== "all") ||
    (activeFilters.period && activeFilters.period !== "all");

  const funnel = metrics?.funnel || {
    registeredCount: 0,
    resumeUploadedCount: 0,
    resumeAnalyzedCount: 0,
    interviewStartedCount: 0,
    interviewCompletedCount: 0,
    fullyPreparedCount: 0,
    completionRate: 0,
  };

  const registeredStudents = metrics?.registeredStudentsCount ?? 0;
  const activeStudents = metrics?.activeStudentsCount ?? 0;
  const resumeSubmissions = metrics?.resumeSubmissionsCount ?? 0;
  const fullyPrepared = funnel.fullyPreparedCount;

  // Pipeline stages with conversion and drop-off
  const pipelineStages = [
    {
      step: 1,
      label: "Registered",
      count: funnel.registeredCount,
      sub: "Eligible participants",
      dropOff:
        funnel.registeredCount > funnel.resumeUploadedCount
          ? funnel.registeredCount - funnel.resumeUploadedCount
          : 0,
      conversion: "100%",
    },
    {
      step: 2,
      label: "Resume Submitted",
      count: funnel.resumeUploadedCount,
      sub: "Uploaded file",
      dropOff:
        funnel.resumeUploadedCount > funnel.resumeAnalyzedCount
          ? funnel.resumeUploadedCount - funnel.resumeAnalyzedCount
          : 0,
      conversion:
        funnel.registeredCount > 0
          ? `${Math.round((funnel.resumeUploadedCount / funnel.registeredCount) * 100)}%`
          : "0%",
    },
    {
      step: 3,
      label: "Resume Analyzed",
      count: funnel.resumeAnalyzedCount,
      sub: "ATS & alignment",
      dropOff:
        funnel.resumeAnalyzedCount > funnel.interviewStartedCount
          ? funnel.resumeAnalyzedCount - funnel.interviewStartedCount
          : 0,
      conversion:
        funnel.registeredCount > 0
          ? `${Math.round((funnel.resumeAnalyzedCount / funnel.registeredCount) * 100)}%`
          : "0%",
    },
    {
      step: 4,
      label: "Interview Started",
      count: funnel.interviewStartedCount,
      sub: "Session initiated",
      dropOff:
        funnel.interviewStartedCount > funnel.interviewCompletedCount
          ? funnel.interviewStartedCount - funnel.interviewCompletedCount
          : 0,
      conversion:
        funnel.registeredCount > 0
          ? `${Math.round((funnel.interviewStartedCount / funnel.registeredCount) * 100)}%`
          : "0%",
    },
    {
      step: 5,
      label: "Interview Completed",
      count: funnel.interviewCompletedCount,
      sub: "Report compiled",
      dropOff:
        funnel.interviewCompletedCount > funnel.fullyPreparedCount
          ? funnel.interviewCompletedCount - funnel.fullyPreparedCount
          : 0,
      conversion:
        funnel.registeredCount > 0
          ? `${Math.round((funnel.interviewCompletedCount / funnel.registeredCount) * 100)}%`
          : "0%",
    },
    {
      step: 6,
      label: "Evaluation Complete",
      count: funnel.fullyPreparedCount,
      sub: "Ready for Employment",
      dropOff: 0,
      conversion: `${funnel.completionRate}%`,
    },
  ];

  // Growth Chart parameters
  const growthData = metrics?.growthData || [
    { month: "Apr", count: 0 },
    { month: "May", count: 0 },
    { month: "Jun", count: 0 },
    { month: "Jul", count: 0 },
    { month: "Aug", count: 0 },
    { month: "Sep", count: 0 },
  ];

  const lastMonth = growthData[growthData.length - 1];
  const factualSummary = lastMonth
    ? `${lastMonth.count} ${lastMonth.count === 1 ? "registration" : "registrations"} in ${lastMonth.month}`
    : "No registrations in selected period";

  const maxCount = Math.max(...growthData.map((d) => d.count), 3);
  const chartWidth = 760;
  const chartHeight = 230;
  const paddingLeft = 44;
  const paddingRight = 30;
  const paddingTop = 26;
  const paddingBottom = 34;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const points = growthData.map((d, idx) => {
    const x = paddingLeft + (idx / Math.max(growthData.length - 1, 1)) * usableWidth;
    const y = chartHeight - paddingBottom - (d.count / maxCount) * usableHeight;
    return { ...d, x, y };
  });

  let smoothPath = "";
  if (points.length > 0) {
    smoothPath = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      smoothPath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
  }

  const baselineY = chartHeight - paddingBottom;
  const areaPath =
    points.length > 0
      ? `${smoothPath} L ${points[points.length - 1].x.toFixed(1)},${baselineY.toFixed(1)} L ${points[0].x.toFixed(1)},${baselineY.toFixed(1)} Z`
      : "";

  return (
    <div className="space-y-6 text-[#1E3E6B]">
      {/* Header: Title, Subtitle, & Truthful Freshness */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#1E3E6B]">
            Institutional Analytics
          </h1>
          <p className="text-xs md:text-sm font-semibold text-[#5F7E97] mt-0.5">
            Career Center Population Monitoring · September 11, 2026 MOM Architecture
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D9488] bg-[#E7EFF5]/60 px-3 py-1.5 rounded-lg border border-[#DCE6EE]">
            <Radio size={13} className="text-[#0D9488] animate-pulse" />
            <span>Live Listener Active</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5F7E97] bg-white px-3 py-1.5 rounded-lg border border-[#DCE6EE]">
            <Clock size={13} className="text-[#1E3E6B]" />
            <span>Synced: {health?.lastSyncTime || "Just now"}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Unified Scope Filters Bar using shared Select component */}
      <div className="p-3.5 bg-white rounded-xl border border-[#DCE6EE] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#1E3E6B] uppercase tracking-wider">
            <Filter size={14} /> Scope:
          </div>

          {/* Program filter */}
          {/* Coordinator filter (Renamed from College - OJT Coordinators assigned to departments/colleges) */}
          <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 text-xs lg:w-auto">
            <span className="font-semibold text-[#5F7E97]">Coordinator:</span>
            <Select
              value={activeFilters.coordinator || "all"}
              onChange={(e) => updateFiltersInUrl({ coordinator: e.target.value })}
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

          {/* Period filter */}
          <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 text-xs lg:w-auto">
            <span className="font-semibold text-[#5F7E97]">Period:</span>
            <Select
              value={activeFilters.period || "all"}
              onChange={(e) =>
                updateFiltersInUrl({
                  period: e.target.value as AnalyticsFilterParams["period"],
                })
              }
              aria-label="Filter by Reporting Period"
            >
              <option value="all">All Recorded History</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last 1 Year</option>
            </Select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-xs font-bold text-[#1E3E6B] hover:text-[#274f89] cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RotateCcw size={12} /> Reset Scope
          </button>
        )}
      </div>

      {/* PHASE 3 & 4: Deliberate Hierarchy — Population Hero + Progress Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* PRIMARY HERO: Students in Scope (Dominant Visual Anchor) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#DCE6EE] p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#5F7E97]">
                Students in Scope
              </span>
              <Users size={18} className="text-[#5F7E97]" />
            </div>
            <div className="text-5xl font-black text-[#1E3E6B] tracking-tight mt-2">
              {registeredStudents}
            </div>
            <p className="text-xs font-medium text-[#5F7E97] mt-1">
              Total eligible student profiles within active scope.
            </p>
          </div>

          <div className="pt-4 border-t border-[#DCE6EE] flex items-center justify-between text-xs font-semibold">
            <span className="text-[#0D9488] font-bold">
              {activeStudents} Active Accounts
            </span>
            <span className="text-[#5F7E97]">
              {registeredStudents - activeStudents} Disabled
            </span>
          </div>
        </div>

        {/* SECONDARY MILESTONES: Preparation Progress Panel */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#DCE6EE] p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[#DCE6EE] pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#5F7E97]">
              Employability Preparation Milestones
            </span>
            <span className="text-xs font-bold text-[#0D9488]">
              {funnel.completionRate}% Overall Preparedness Rate
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Milestone 1: Resumes Analyzed */}
            <div className="p-3.5 bg-[#E7EFF5]/30 rounded-lg border border-[#DCE6EE] space-y-1">
              <span className="text-[11px] font-bold text-[#5F7E97] block uppercase">
                Resume Analyzed
              </span>
              <div className="text-2xl font-black text-[#1E3E6B]">
                {funnel.resumeAnalyzedCount}
              </div>
              <span className="text-[11px] text-[#5F7E97] block">
                {registeredStudents > 0
                  ? `${Math.round((funnel.resumeAnalyzedCount / registeredStudents) * 100)}% of participants`
                  : "0%"}
              </span>
            </div>

            {/* Milestone 2: Mock Interview Done */}
            <div className="p-3.5 bg-[#E7EFF5]/30 rounded-lg border border-[#DCE6EE] space-y-1">
              <span className="text-[11px] font-bold text-[#5F7E97] block uppercase">
                Interview Completed
              </span>
              <div className="text-2xl font-black text-[#1E3E6B]">
                {funnel.interviewCompletedCount}
              </div>
              <span className="text-[11px] text-[#5F7E97] block">
                {registeredStudents > 0
                  ? `${Math.round((funnel.interviewCompletedCount / registeredStudents) * 100)}% of participants`
                  : "0%"}
              </span>
            </div>

            {/* Milestone 3: Evaluation Complete */}
            <div className="p-3.5 bg-[#E7EFF5]/30 rounded-lg border border-[#DCE6EE] space-y-1">
              <span className="text-[11px] font-bold text-[#0D9488] block uppercase">
                Evaluation Complete
              </span>
              <div className="text-2xl font-black text-[#0D9488]">
                {fullyPrepared}
              </div>
              <span className="text-[11px] text-[#5F7E97] block">
                Ready for Employment
              </span>
            </div>
          </div>

          {/* Tertiary Context Note */}
          <div className="pt-2 text-[11px] text-[#5F7E97] flex items-center justify-between">
            <span>
              {resumeSubmissions} total resume submissions recorded across candidate revisions.
            </span>
            <Link
              href="/students"
              className="text-xs font-bold text-[#1E3E6B] hover:text-[#274f89] inline-flex items-center gap-1 transition-colors"
            >
              <span>View Roster</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* PHASE 5: Career Center Population vs Completion Progression Pipeline (September 11 MOM) */}
      <div className="p-6 bg-white rounded-xl border border-[#DCE6EE] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE6EE] pb-4">
          <div>
            <h2 className="text-base font-black text-[#1E3E6B] flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#0D9488]" /> Career Center Progression Pipeline
            </h2>
            <p className="text-xs font-medium text-[#5F7E97] mt-0.5">
              Population progression through the 6 preparation stages. Drop-offs indicate students requiring intervention.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#E7EFF5]/60 border border-[#DCE6EE] px-3 py-1.5 rounded-lg text-xs font-extrabold text-[#1E3E6B] shrink-0">
            Pipeline Preparedness: {funnel.completionRate}%
          </div>
        </div>

        {/* Staged Visualization: Uniform Responsive Pipeline Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-stretch">
          {pipelineStages.map((stage, idx) => (
            <div
              key={idx}
              className="p-4 bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9]/50 rounded-xl border border-[#DCE6EE] flex flex-col justify-between space-y-3 relative shadow-xs hover:border-[#1E3E6B]/30 transition-all duration-150 h-full min-h-[175px]"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-[#5F7E97]">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1E3E6B] bg-[#E7EFF5]/80 px-2 py-0.5 rounded">
                  Stage {stage.step}
                </span>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight size={13} className="hidden lg:block text-[#5F7E97]/60" />
                )}
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-black text-[#1E3E6B] tracking-tight">{stage.count}</div>
                <div className="text-xs font-bold text-[#1E3E6B] min-h-[2rem] flex items-center leading-snug">
                  {stage.label}
                </div>
                <div className="text-[11px] text-[#5F7E97] min-h-[1.75rem] leading-tight">
                  {stage.sub}
                </div>
              </div>

              <div className="mt-auto pt-2.5 border-t border-[#DCE6EE] space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#5F7E97] font-medium">Conversion:</span>
                  <span className="font-extrabold text-[#1E3E6B]">{stage.conversion}</span>
                </div>
                <div className="min-h-[1rem]">
                  {stage.dropOff > 0 ? (
                    <div className="text-[10px] font-semibold text-amber-700">
                      -{stage.dropOff} student drop-off
                    </div>
                  ) : (
                    <div className="text-[10px] font-semibold text-[#0D9488]">
                      Complete retention
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Authoritative Evaluation Performance & Registration Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Student Registration Trend (2 cols) */}
        <div className="lg:col-span-2 p-6 bg-white rounded-xl border border-[#DCE6EE] flex flex-col justify-between space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1E3E6B] flex items-center gap-2">
                <TrendingUp size={18} className="text-[#1E3E6B]" /> Student Registration Trend
              </h2>
              <p className="text-xs font-medium text-[#5F7E97] mt-0.5">
                Monthly student account registrations recorded across degree programs.
              </p>
            </div>

            <span className="text-xs font-bold px-3 py-1 bg-[#E7EFF5]/60 text-[#1E3E6B] border border-[#DCE6EE] rounded-lg">
              {factualSummary}
            </span>
          </div>

          {/* SVG Line Chart */}
          <div className="flex-1 w-full min-h-[220px] flex flex-col justify-center relative bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9]/50 rounded-xl p-4 sm:p-5 border border-[#DCE6EE] shadow-xs">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto min-h-[190px] overflow-visible select-none"
            >
              <defs>
                <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E3E6B" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#2563EB" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0D9488" stopOpacity="0.00" />
                </linearGradient>
                <linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1E3E6B" />
                  <stop offset="60%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#0D9488" />
                </linearGradient>
                <filter id="trendGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1E3E6B" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Grid & Axis Marks */}
              <g className="text-[10px] font-semibold fill-[#64748B]">
                <line
                  x1={paddingLeft}
                  y1={paddingTop}
                  x2={chartWidth - paddingRight}
                  y2={paddingTop}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
                <text x={paddingLeft - 8} y={paddingTop + 3} textAnchor="end">
                  {maxCount}
                </text>

                <line
                  x1={paddingLeft}
                  y1={paddingTop + usableHeight / 2}
                  x2={chartWidth - paddingRight}
                  y2={paddingTop + usableHeight / 2}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
                <text x={paddingLeft - 8} y={paddingTop + usableHeight / 2 + 3} textAnchor="end">
                  {Math.round(maxCount / 2)}
                </text>

                <line
                  x1={paddingLeft}
                  y1={chartHeight - paddingBottom}
                  x2={chartWidth - paddingRight}
                  y2={chartHeight - paddingBottom}
                  stroke="#CBD5E1"
                  strokeWidth="1.25"
                />
                <text x={paddingLeft - 8} y={chartHeight - paddingBottom + 3} textAnchor="end">
                  0
                </text>
              </g>

              {/* Area Fill */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#trendAreaGradient)"
                />
              )}

              {/* Smooth Trend Curve */}
              {smoothPath && (
                <path
                  d={smoothPath}
                  fill="none"
                  stroke="url(#trendLineGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#trendGlow)"
                />
              )}

              {/* Interactive Points */}
              {points.map((p, idx) => {
                const isHovered = hoveredPoint?.month === p.month;
                const hasValue = p.count > 0;
                return (
                  <g
                    key={idx}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {(isHovered || hasValue) && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? "8" : "6"}
                        fill={hasValue ? "#2563EB" : "#94A3B8"}
                        opacity={isHovered ? "0.35" : "0.18"}
                      />
                    )}

                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? "5" : "4"}
                      fill={hasValue ? (isHovered ? "#2563EB" : "#1E3E6B") : "#94A3B8"}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />

                    {hasValue && (
                      <text
                        x={p.x}
                        y={p.y - 10}
                        textAnchor="middle"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                        paintOrder="stroke fill"
                        className="text-[11px] font-extrabold fill-[#1E3E6B]"
                      >
                        {p.count}
                      </text>
                    )}

                    <text
                      x={p.x}
                      y={chartHeight - paddingBottom + 18}
                      textAnchor="middle"
                      className={`text-[11px] font-semibold transition-colors ${
                        isHovered ? "fill-[#1E3E6B] font-bold" : "fill-[#64748B]"
                      }`}
                    >
                      {p.month}
                    </text>
                  </g>
                );
              })}
            </svg>

            {hoveredPoint && (
              <div
                className="absolute z-10 bg-[#1E3E6B] text-white text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-lg pointer-events-none -translate-x-1/2 -translate-y-full border border-white/20 backdrop-blur-sm"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100 - 10}%`,
                }}
              >
                <div className="font-bold">{hoveredPoint.month}</div>
                <div className="text-[#93C5FD]">
                  {hoveredPoint.count}{" "}
                  {hoveredPoint.count === 1 ? "registration" : "registrations"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Evaluation Summary & System Infrastructure (1 col) */}
        <div className="p-6 bg-white rounded-xl border border-[#DCE6EE] flex flex-col justify-between space-y-5">
          <div>
            <h2 className="text-base font-black text-[#1E3E6B] flex items-center gap-2 mb-3">
              <Award size={18} className="text-[#1E3E6B]" /> Evaluation Averages
            </h2>
            <p className="text-xs font-medium text-[#5F7E97] mb-4">
              Stored metrics across verified student participant groups.
            </p>

            <div className="p-4 rounded-xl bg-[#E7EFF5]/30 border border-[#DCE6EE] space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#5F7E97]">Avg Resume Score:</span>
                <span className="font-black text-[#1E3E6B]">
                  {metrics?.performanceSummary?.avgResumeScore !== null &&
                  metrics?.performanceSummary?.avgResumeScore !== undefined
                    ? `${metrics.performanceSummary.avgResumeScore} / 100`
                    : "Not Evaluated"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#5F7E97]">Avg Mock Interview:</span>
                <span className="font-black text-[#1E3E6B]">
                  {metrics?.performanceSummary?.avgInterviewScore !== null &&
                  metrics?.performanceSummary?.avgInterviewScore !== undefined
                    ? `${metrics.performanceSummary.avgInterviewScore} / 100`
                    : "Not Evaluated"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[#DCE6EE]">
                <span className="font-semibold text-[#5F7E97]">Avg Employability:</span>
                <span className="font-black text-[#0D9488]">
                  {metrics?.performanceSummary?.avgEmployabilityScore !== null &&
                  metrics?.performanceSummary?.avgEmployabilityScore !== undefined
                    ? `${metrics.performanceSummary.avgEmployabilityScore} / 100`
                    : "Incomplete Data"}
                </span>
              </div>
              <div className="text-[10px] text-[#5F7E97] font-medium pt-1">
                Calculated over {metrics?.performanceSummary?.fullyEvaluatedStudentsCount ?? 0} fully evaluated student(s).
              </div>
            </div>
          </div>

          {/* System & Audit Infrastructure */}
          <div>
            <h3 className="text-xs font-bold text-[#5F7E97] uppercase tracking-wider mb-2">
              Platform Status
            </h3>
            <div className="space-y-2 text-xs font-bold text-[#1E3E6B]">
              <div className="p-2.5 rounded-lg bg-gray-50 border border-[#DCE6EE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-[#1E3E6B] shrink-0" />
                  <span>Firestore Database</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Online
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-gray-50 border border-[#DCE6EE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server size={14} className="text-[#1E3E6B] shrink-0" />
                  <span>AI Scoring Core</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {health?.aiServiceStatus === "healthy" ? "Active" : "Offline"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-gray-50 border border-[#DCE6EE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#0D9488] shrink-0" />
                  <span>Protected Audit Logging</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-teal-50 text-teal-800 border border-teal-200">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex h-[65vh] flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs font-bold text-brand-slate">Loading dashboard statistics...</p>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </DashboardLayout>
  );
}
