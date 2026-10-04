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
  AlertCircle,
  ArrowRight,
  ChevronRight,
  FileText,
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

    const newFilters: AnalyticsFilterParams = {
      coordinator: getCoordinatorById(urlCoordinator || "all")?.id || "all",
      period: urlPeriod || "all",
    };

    setFilters(newFilters);
    loadDashboardData(newFilters, currentAdmin?.role);
  }, [
    searchParams,
    currentAdmin?.role,
    currentAdmin?.uid,
    setFilters,
    loadDashboardData,
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
      sub: "Eligible cohort",
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
      label: "Fully Prepared",
      count: funnel.fullyPreparedCount,
      sub: "Ready for OJT",
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
  const chartWidth = 540;
  const chartHeight = 130;
  const paddingLeft = 35;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 25;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const points = growthData.map((d, idx) => {
    const x = paddingLeft + (idx / Math.max(growthData.length - 1, 1)) * usableWidth;
    const y = chartHeight - paddingBottom - (d.count / maxCount) * usableHeight;
    return { ...d, x, y };
  });

  const strokePath = points.length > 0 ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";

  // Career Center Operational "Needs Attention" derived from actual stored data
  const attention = metrics?.needsAttention;
  const attentionItems = [
    {
      title: "Resumes Pending Analysis",
      description: "Students who uploaded a resume document but lack completed canonical analysis.",
      count: attention?.resumeMissingAnalysis.count ?? 0,
      link: "/students?resumeStatus=uploaded&score=incomplete",
    },
    {
      title: "Analyzed Resumes Without Mock Interview",
      description: "Students with analyzed resumes who have not initiated an interview simulation.",
      count: attention?.analysisWithoutInterview.count ?? 0,
      link: "/students?resumeStatus=uploaded",
    },
    {
      title: "Interview Started but Incomplete",
      description: "Students with active or unfinalized voice/VR interview simulation sessions.",
      count: attention?.interviewInProgress.count ?? 0,
      link: "/students",
    },
    {
      title: "Incomplete Employability Profile",
      description: "Students lacking either resume scoring or interview completion.",
      count: attention?.incompleteEvaluations.count ?? 0,
      link: "/students?score=incomplete",
    },
  ];

  const totalAttentionNeeded = attentionItems.reduce((acc, item) => acc + item.count, 0);

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
            className="flex items-center gap-1 text-xs font-bold text-[#1E3E6B] hover:text-[#F59E73] cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
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
                  ? `${Math.round((funnel.resumeAnalyzedCount / registeredStudents) * 100)}% of cohort`
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
                  ? `${Math.round((funnel.interviewCompletedCount / registeredStudents) * 100)}% of cohort`
                  : "0%"}
              </span>
            </div>

            {/* Milestone 3: Fully Prepared */}
            <div className="p-3.5 bg-[#E7EFF5]/30 rounded-lg border border-[#DCE6EE] space-y-1">
              <span className="text-[11px] font-bold text-[#0D9488] block uppercase">
                Fully Prepared
              </span>
              <div className="text-2xl font-black text-[#0D9488]">
                {fullyPrepared}
              </div>
              <span className="text-[11px] text-[#5F7E97] block">
                Ready for OJT Placement
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
              className="text-xs font-bold text-[#1E3E6B] hover:text-[#F59E73] inline-flex items-center gap-1"
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

        {/* Staged Visualization: Horizontal Pipeline on Desktop, Vertical on Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {pipelineStages.map((stage, idx) => (
            <div
              key={idx}
              className="p-4 bg-[#E7EFF5]/20 rounded-xl border border-[#DCE6EE] flex flex-col justify-between space-y-3 relative"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-[#5F7E97]">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#1E3E6B]">
                  Stage {stage.step}
                </span>
                {idx < pipelineStages.length - 1 && (
                  <ArrowRight size={13} className="hidden lg:block text-[#5F7E97]/60" />
                )}
              </div>

              <div>
                <div className="text-2xl font-black text-[#1E3E6B]">{stage.count}</div>
                <div className="text-xs font-bold text-[#1E3E6B] truncate">{stage.label}</div>
                <div className="text-[11px] text-[#5F7E97]">{stage.sub}</div>
              </div>

              <div className="pt-2 border-t border-[#DCE6EE] space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#5F7E97] font-medium">Conversion:</span>
                  <span className="font-extrabold text-[#1E3E6B]">{stage.conversion}</span>
                </div>
                {stage.dropOff > 0 && (
                  <div className="text-[10px] font-semibold text-amber-700">
                    -{stage.dropOff} student drop-off
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational: Career Center "Needs Attention" Section */}
      <div className="p-6 bg-white rounded-xl border border-[#DCE6EE] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE6EE] pb-3">
          <div>
            <h2 className="text-base font-black text-[#1E3E6B] flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600" /> Operational Attention Queue
            </h2>
            <p className="text-xs font-medium text-[#5F7E97] mt-0.5">
              Actionable cohorts requiring coordinator or career center outreach based on authoritative states.
            </p>
          </div>
          <span className="text-xs font-bold text-[#5F7E97]">
            {totalAttentionNeeded} student cohort item(s) flagged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {attentionItems.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-white rounded-xl border border-[#DCE6EE] flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-black ${
                      item.count > 0
                        ? "bg-amber-50 text-amber-900 border border-amber-200"
                        : "bg-gray-50 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {item.count} Student{item.count === 1 ? "" : "s"}
                  </span>
                </div>
                <h3 className="text-xs font-extrabold text-[#1E3E6B] mt-2">{item.title}</h3>
                <p className="text-[11px] font-medium text-[#5F7E97] mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <Link
                href={item.link}
                className="inline-flex items-center justify-between text-xs font-bold text-[#1E3E6B] hover:text-[#F59E73] pt-2 border-t border-[#DCE6EE] group"
              >
                <span>View Students</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
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
          <div className="w-full relative bg-[#E7EFF5]/20 rounded-xl p-4 border border-[#DCE6EE]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto overflow-visible select-none"
            >
              <g className="text-[10px] font-bold fill-[#5F7E97]">
                <line
                  x1={paddingLeft}
                  y1={paddingTop}
                  x2={chartWidth - paddingRight}
                  y2={paddingTop}
                  stroke="#DCE6EE"
                  strokeDasharray="3 3"
                />
                <text x={paddingLeft - 8} y={paddingTop + 3} textAnchor="end">
                  {maxCount}
                </text>

                <line
                  x1={paddingLeft}
                  y1={paddingTop + usableHeight / 2}
                  x2={chartWidth - paddingRight}
                  y2={paddingTop + usableHeight / 2}
                  stroke="#DCE6EE"
                  strokeDasharray="3 3"
                />
                <text x={paddingLeft - 8} y={paddingTop + usableHeight / 2 + 3} textAnchor="end">
                  {Math.round(maxCount / 2)}
                </text>

                <line
                  x1={paddingLeft}
                  y1={chartHeight - paddingBottom}
                  x2={chartWidth - paddingRight}
                  y2={chartHeight - paddingBottom}
                  stroke="#DCE6EE"
                  strokeWidth="1.5"
                />
                <text x={paddingLeft - 8} y={chartHeight - paddingBottom + 3} textAnchor="end">
                  0
                </text>
              </g>

              {strokePath && (
                <path
                  d={strokePath}
                  fill="none"
                  stroke="#1E3E6B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((p, idx) => (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    fill={p.count > 0 ? "#1E3E6B" : "#94A3B8"}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    className={`text-[11px] font-black ${
                      p.count > 0 ? "fill-[#1E3E6B]" : "fill-gray-400"
                    }`}
                  >
                    {p.count}
                  </text>
                  <text
                    x={p.x}
                    y={chartHeight - paddingBottom + 16}
                    textAnchor="middle"
                    className="text-[11px] font-bold fill-[#5F7E97]"
                  >
                    {p.month}
                  </text>
                </g>
              ))}
            </svg>

            {hoveredPoint && (
              <div
                className="absolute z-10 bg-[#1E3E6B] text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-md pointer-events-none -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100 - 8}%`,
                }}
              >
                {hoveredPoint.month}: {hoveredPoint.count}{" "}
                {hoveredPoint.count === 1 ? "registration" : "registrations"}
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
              Stored metrics across verified student cohorts.
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
