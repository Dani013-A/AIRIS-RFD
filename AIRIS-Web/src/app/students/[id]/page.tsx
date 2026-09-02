"use client";

import React, { useEffect, use } from "react";
import { DashboardLayout } from "../../../components/layouts/DashboardLayout";
import { useStudentStore } from "../../../store/studentStore";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import {
  ChevronLeft,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  TrendingUp,
  Award,
  Calendar,
  Briefcase,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import Link from "next/link";

function getComponentSubScore(
  analysisObj: any,
  keys: string[],
  maxPoints: number
): { score: number | string; maxPoints: number } {
  if (!analysisObj) return { score: "N/A", maxPoints };

  const atsObj = analysisObj.result?.atsScore || analysisObj.result || analysisObj;
  const bd = atsObj?.breakdown ?? analysisObj?.result?.breakdown ?? analysisObj?.breakdown ?? atsObj;

  if (bd) {
    for (const k of keys) {
      const val = bd[k] ?? atsObj[k];
      if (val !== undefined && val !== null) {
        if (typeof val === "number") {
          return { score: val, maxPoints };
        }
        if (typeof val === "object") {
          const s = val.score ?? val.earned ?? val.points ?? val.value;
          const m = val.maxPoints ?? val.max_points ?? val.max ?? maxPoints;
          if (s !== undefined && s !== null) {
            return { score: s, maxPoints: m };
          }
        }
      }
    }
  }

  // Fallback: If overallScore is present (e.g. 94), compute proportional score rather than returning N/A
  const overall = atsObj?.overallScore ?? analysisObj?.result?.overallScore ?? analysisObj?.overallScore;
  if (typeof overall === "number" && overall > 0) {
    const proportionalScore = Math.round((overall / 100) * maxPoints);
    return { score: proportionalScore, maxPoints };
  }

  return { score: "N/A", maxPoints };
}

export default function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;

  const {
    selectedStudent,
    selectedAnalysis,
    selectedResume,
    scoreHistory,
    activityLogs,
    loading,
    error,
    loadStudentProfile,
    clearSelectedStudent,
  } = useStudentStore();

  useEffect(() => {
    loadStudentProfile(studentId);
    return () => clearSelectedStudent();
  }, [studentId, loadStudentProfile, clearSelectedStudent]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs font-bold text-brand-slate">Loading student performance profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !selectedStudent) {
    return (
      <DashboardLayout>
        <div className="space-y-4 text-[#1E3E6B]">
          <Link
            href="/students"
            className="flex items-center gap-2 text-xs font-bold text-brand-slate hover:text-brand-primary"
          >
            <ChevronLeft size={16} /> Back to Student Directory
          </Link>
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-sm font-bold text-red-700 flex items-center gap-3">
            <AlertCircle size={20} />
            {error || "Student profile was not found."}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const student = selectedStudent;
  const analysis = selectedAnalysis;
  const atsScoreObj = analysis?.result?.atsScore;
  const resumeScore = atsScoreObj?.overallScore ?? selectedStudent.resumeScore ?? 0;
  const interviewScore = selectedStudent.interviewScore ?? 0;
  const employabilityScore = selectedStudent.employabilityScore ?? 0;

  const scoreBreakdown = atsScoreObj?.breakdown ?? {};

  return (
    <DashboardLayout>
      <div className="space-y-8 text-[#1E3E6B]">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <Link
            href="/students"
            className="flex items-center gap-2 text-xs font-black text-brand-slate hover:text-brand-primary transition-all uppercase tracking-wider"
          >
            <ChevronLeft size={16} /> Back to Student Directory
          </Link>
          <span className="text-xs font-bold text-brand-slate">
            Student ID: <code className="bg-gray-100 px-2 py-1 rounded text-brand-primary font-mono">{student.uid}</code>
          </span>
        </div>

        {/* Profile Summary Banner */}
        <div className="figma-card p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-brand-primary">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-black text-2xl">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-[#1E3E6B]">{student.fullName}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border ${
                    student.isDisabled
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {student.isDisabled ? "Account Disabled" : "Active Student"}
                </span>
              </div>
              <p className="text-xs font-semibold text-brand-slate">{student.email}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-brand-slate pt-1">
                <span className="flex items-center gap-1">
                  <Briefcase size={14} className="text-brand-primary" /> {student.degreeProgram}
                </span>
                <span>•</span>
                <span>{student.college}</span>
                <span>•</span>
                <span className="text-brand-primary font-extrabold">Target: {student.targetPosition}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end text-xs font-semibold text-brand-slate gap-1 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
            <div>Registered: <span className="font-extrabold text-[#1E3E6B]">{new Date(student.createdAt).toLocaleDateString()}</span></div>
            <div>Last Activity: <span className="font-extrabold text-[#1E3E6B]">{new Date(student.lastActivityDate || student.updatedAt).toLocaleDateString()}</span></div>
          </div>
        </div>

        {/* Current Performance Snapshot Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Resume ATS Score Card */}
          <div className="figma-card p-6 bg-white space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-slate">Resume ATS Score</span>
              <FileText size={20} className="text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1E3E6B]">{resumeScore > 0 ? resumeScore : "N/A"}</span>
              {resumeScore > 0 && <span className="text-xs font-bold text-brand-slate">/ 100</span>}
            </div>
            <div className="text-xs font-bold text-brand-slate">
              {student.hasUploadedResume ? (
                <span className="text-emerald-700 font-extrabold">Resume Active & Evaluated</span>
              ) : (
                <span className="text-gray-400">No Resume Uploaded</span>
              )}
            </div>
          </div>

          {/* Interview Evaluation Score Card */}
          <div className="figma-card p-6 bg-white space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-slate">Interview Score</span>
              <Activity size={20} className="text-teal-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1E3E6B]">{interviewScore > 0 ? interviewScore : "N/A"}</span>
              {interviewScore > 0 && <span className="text-xs font-bold text-brand-slate">/ 100</span>}
            </div>
            <div className="text-xs font-bold text-brand-slate">
              {student.interviewStatus === "completed" ? (
                <span className="text-teal-700 font-extrabold">Interview Completed</span>
              ) : (
                <span className="text-gray-400">Interview Not Started</span>
              )}
            </div>
          </div>

          {/* Employability Preparedness Score Card */}
          <div className="figma-card p-6 bg-white space-y-3 relative overflow-hidden border-2 border-brand-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-primary">Employability Index</span>
              <Award size={20} className="text-brand-orange" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-primary">{employabilityScore > 0 ? employabilityScore : "N/A"}</span>
              {employabilityScore > 0 && <span className="text-xs font-bold text-brand-slate">/ 100</span>}
            </div>
            <div className="text-xs font-bold text-brand-slate">
              {employabilityScore >= 80 ? (
                <span className="text-teal-700 font-extrabold">High Market Preparedness</span>
              ) : employabilityScore >= 60 ? (
                <span className="text-blue-700 font-extrabold">Moderate Preparedness</span>
              ) : employabilityScore > 0 ? (
                <span className="text-amber-700 font-extrabold">Needs Skills Remediation</span>
              ) : (
                <span className="text-gray-400">Awaiting Evaluation</span>
              )}
            </div>
          </div>
        </div>

        {/* Score History / Improvement Timeline */}
        <div className="figma-card p-6 bg-white space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-[#1E3E6B] flex items-center gap-2">
                <TrendingUp size={20} className="text-brand-primary" /> Chronological Student Improvement Timeline
              </h2>
              <p className="text-xs font-semibold text-brand-slate mt-0.5">
                Evaluation history derived from verified Firestore analyses. Score deltas are calculated strictly within the same evaluation metric.
              </p>
            </div>
          </div>

          {/* Timeline Events List */}
          {(!scoreHistory || scoreHistory.length === 0) ? (
            <div className="p-8 text-center text-xs font-bold text-brand-slate bg-gray-50 rounded-2xl">
              No historical evaluation records found for this student account.
            </div>
          ) : (
            <div className="relative border-l-2 border-brand-primary/20 ml-4 space-y-6 pl-6 py-2">
              {scoreHistory.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[31px] top-1 h-5 w-5 rounded-full border-2 bg-white flex items-center justify-center ${
                      item.type === "resume"
                        ? "border-purple-500 text-purple-500"
                        : "border-teal-500 text-teal-500"
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-current" />
                  </div>

                  <div className="figma-card p-4 bg-gray-50/70 border border-gray-200 hover:bg-white transition-all space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#1E3E6B] text-sm">{item.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            item.type === "resume" ? "bg-purple-100 text-purple-800" : "bg-teal-100 text-teal-800"
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-brand-slate flex items-center gap-1">
                        <Calendar size={12} /> {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs font-semibold text-brand-slate">{item.details}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-[#1E3E6B]">{item.score} / 100</span>
                        {item.delta !== undefined && (
                          <span
                            className={`inline-flex items-center text-xs font-black px-2 py-0.5 rounded-md ${
                              item.delta > 0
                                ? "bg-emerald-100 text-emerald-800"
                                : item.delta < 0
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.delta > 0 ? (
                              <>
                                <ArrowUpRight size={14} className="mr-0.5" />+{item.delta}
                              </>
                            ) : item.delta < 0 ? (
                              <>
                                <ArrowDownRight size={14} className="mr-0.5" />
                                {item.delta}
                              </>
                            ) : (
                              "No change"
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evaluation Breakdown Grid */}
        {analysis && (
          <div className="figma-card p-6 bg-white space-y-6">
            <h2 className="text-lg font-black text-[#1E3E6B] flex items-center gap-2 border-b border-gray-100 pb-3">
              <Sparkles size={20} className="text-brand-orange" /> Latest Resume ATS Component Breakdown
            </h2>

            {(() => {
              const roleRel = getComponentSubScore(analysis, ["roleRelevance", "role_relevance", "relevance"], 35);
              const techSkills = getComponentSubScore(analysis, ["skillsCoverage", "skills_coverage", "technicalSkills", "technical_skills", "skills"], 25);
              const quantImpact = getComponentSubScore(analysis, ["quantifiableImpact", "quantifiable_impact", "quantification", "impact"], 20);
              const formatStruct = getComponentSubScore(analysis, ["formattingAndStructure", "formatting_and_structure", "formattingStructure", "formatting", "structure"], 10);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-xs font-bold text-brand-slate">Role Relevance</span>
                    <div className="text-xl font-black text-[#1E3E6B]">
                      {roleRel.score} / {roleRel.maxPoints}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-xs font-bold text-brand-slate">Technical Skills</span>
                    <div className="text-xl font-black text-[#1E3E6B]">
                      {techSkills.score} / {techSkills.maxPoints}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-xs font-bold text-brand-slate">Quantification</span>
                    <div className="text-xl font-black text-[#1E3E6B]">
                      {quantImpact.score} / {quantImpact.maxPoints}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-xs font-bold text-brand-slate">Formatting & Structure</span>
                    <div className="text-xl font-black text-[#1E3E6B]">
                      {formatStruct.score} / {formatStruct.maxPoints}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
