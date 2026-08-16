"use client";

import React, { useEffect } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useDashboardStore } from "../../store/dashboardStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import {
  Users,
  FileText,
  Activity,
  MessageSquareCode,
  TrendingUp,
  Award,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const { metrics, health, insights, loading, error, loadDashboardData } = useDashboardStore();

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading && !metrics) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  // Cards setup matching Figma image 2 (circular icon badge left, data right)
  const statCards = [
    {
      title: "Total Active Users",
      value: metrics?.totalActiveUsers.toLocaleString() ?? "0",
      icon: Users,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "Interviews Conducted",
      value: (metrics?.totalInterviewsConducted ?? 8924).toLocaleString(), // Mock interviews core placeholder
      icon: Activity,
      iconColor: "text-teal-500",
      bgColor: "bg-teal-50",
    },
    {
      title: "AI Feedbacks Generated",
      value: metrics?.totalAiFeedbackGenerated.toLocaleString() ?? "0",
      icon: MessageSquareCode,
      iconColor: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      title: "Resumes Parsed",
      value: metrics?.totalResumesParsed.toLocaleString() ?? "0",
      icon: FileText,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ];

  // Calculate dynamic SVG path coordinates for the Growth Overview chart
  const growthData = metrics?.growthData || [
    { month: "Jan", count: 0 },
    { month: "Feb", count: 0 },
    { month: "Mar", count: 0 },
    { month: "Apr", count: 0 },
    { month: "May", count: 0 },
    { month: "Jun", count: 0 },
  ];

  const maxVal = Math.max(...growthData.map((d) => d.count), 5); // Fallback to 5 to prevent divide-by-zero & show nice scale
  const points = growthData.map((d, idx) => {
    const x = idx * 100; // 500 divided by 5 segments
    const y = 150 - (d.count / maxVal) * 120; // 150 height with 30px padding at the top
    return { x, y };
  });

  const strokePath = points.length > 0 ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";
  const areaPath = points.length > 0 ? `M 0,150 L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L 500,150 Z` : "";

  return (
    <DashboardLayout>
      <div className="space-y-8 text-[#1E3E6B]">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-black tracking-tight">Application Analytics</h1>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* 4 Metric cards in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="figma-card p-5 flex items-center gap-4 bg-white"
              >
                {/* Rounded icon badge on the left */}
                <div className={`h-12 w-12 rounded-full ${card.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`${card.iconColor}`} size={22} />
                </div>
                {/* Label + count on the right */}
                <div className="flex flex-col">
                  <span className="text-xl font-extrabold text-[#1E3E6B] leading-tight">
                    {card.value}
                  </span>
                  <span className="text-[10px] font-black text-brand-slate uppercase tracking-wider mt-0.5">
                    {card.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Growth overview and aggregate insights in split view */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Growth Overview area chart */}
          <div className="lg:col-span-2 figma-card p-6 bg-white flex flex-col justify-between min-h-[360px]">
            <div>
              <h3 className="text-sm font-extrabold text-[#1E3E6B]">Growth Overview</h3>
              <p className="text-[10px] font-bold text-brand-slate mt-0.5">User acquisition & system activity over time</p>
            </div>

            {/* Custom dynamic SVG Area Chart */}
            <div className="flex-1 w-full flex items-end justify-between gap-4 mt-6 h-48 relative">
              
              {/* Y Axis markings */}
              <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[9px] font-bold text-brand-slate/60 text-right pr-2 select-none">
                <span>{maxVal}</span>
                <span>{Math.round(maxVal * 0.75)}</span>
                <span>{Math.round(maxVal * 0.5)}</span>
                <span>{Math.round(maxVal * 0.25)}</span>
                <span>0</span>
              </div>

              {/* Chart content pane */}
              <div className="flex-1 h-full ml-8 relative border-b border-gray-100 border-l border-gray-100">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#79D5C8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#79D5C8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="37.5" x2="500" y2="37.5" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3" />
                  <line x1="0" y1="112.5" x2="500" y2="112.5" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3" />

                  {/* Area fill */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill="url(#areaGrad)"
                    />
                  )}
                  
                  {/* Curve Line */}
                  {strokePath && (
                    <path
                      d={strokePath}
                      fill="none"
                      stroke="#008080"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </div>

              {/* X Axis markings */}
              <div className="absolute left-8 right-0 bottom-0 flex justify-between text-[9px] font-bold text-brand-slate/60 px-1 select-none">
                {growthData.map((d, idx) => (
                  <span key={idx}>{d.month}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Aggregate Insights card list */}
          <div className="figma-card p-6 bg-white flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-extrabold text-[#1E3E6B]">Aggregate Insights</h3>
              <p className="text-[10px] font-bold text-brand-slate mt-0.5">High-level student performance metrics</p>
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-between">
              
              {/* Insight Item 1 */}
              <div className="flex gap-3.5 items-start p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="h-8 w-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 text-blue-600">
                  <Award size={16} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-[#1E3E6B]">Top Performers</span>
                  <p className="text-[10px] font-semibold text-brand-slate leading-relaxed">
                    <strong className="text-blue-600">{insights?.topPerformersCount ?? 0} students</strong> achieved an overall resume evaluation score of 80 or higher.
                  </p>
                </div>
              </div>

              {/* Insight Item 2 */}
              <div className="flex gap-3.5 items-start p-3 bg-teal-50/50 rounded-2xl border border-teal-100/50">
                <div className="h-8 w-8 bg-teal-100 rounded-xl flex items-center justify-center shrink-0 text-teal-600">
                  <TrendingUp size={16} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-[#1E3E6B]">Consistent Improvement</span>
                  <p className="text-[10px] font-semibold text-brand-slate leading-relaxed">
                    <strong className="text-teal-600">{insights?.consistentImprovementCount ?? 0} users</strong> show multiple resume versions indicating iterations and progress.
                  </p>
                </div>
              </div>

              {/* Insight Item 3 */}
              <div className="flex gap-3.5 items-start p-3 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                <div className="h-8 w-8 bg-orange-100 rounded-xl flex items-center justify-center shrink-0 text-orange-600">
                  <Clock size={16} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-[#1E3E6B]">Engagement Average</span>
                  <p className="text-[10px] font-semibold text-brand-slate leading-relaxed">
                    Students average <strong className="text-orange-600">{insights?.averageResumesPerStudent ?? 0} resume versions</strong> uploaded in their careers dashboard.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* System Health stats bar */}
        <div className="figma-card p-6 bg-white w-full max-w-md">
          <h3 className="text-xs font-extrabold text-[#1E3E6B] uppercase tracking-wider mb-4">System Health</h3>
          
          <div className="space-y-4">
            
            {/* Health metric 1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-extrabold text-brand-slate uppercase">
                <span>AI Service Status</span>
                <span className="text-[#0D9488]">99.9% Uptime</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0D9488] rounded-full" style={{ width: "99.9%" }} />
              </div>
            </div>

            {/* Health metric 2 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-extrabold text-brand-slate uppercase">
                <span>Server Load</span>
                <span className="text-blue-500">Healthy</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "15%" }} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
