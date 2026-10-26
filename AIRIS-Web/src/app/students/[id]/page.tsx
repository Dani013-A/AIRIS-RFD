"use client";

import React, { useEffect, use } from "react";
import { DashboardLayout } from "../../../components/layouts/DashboardLayout";
import { useStudentStore } from "../../../store/studentStore";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  TrendingUp,
  Award,
  Calendar,
  Briefcase,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { studentDirectoryHref } from "../profileNavigation.mjs";

export default function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const searchParams = useSearchParams();
  const directoryHref = studentDirectoryHref(searchParams.toString());

  const {
    selectedStudent,
    selectedAnalysis,
    selectedInterview,
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
          <p className="text-xs font-bold text-brand-slate">Querying student investigation profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !selectedStudent || selectedStudent.uid !== studentId) {
    return (
      <DashboardLayout>
        <div className="space-y-4 text-[#1E3E6B]">
          <Link
            href={directoryHref}
            className="flex items-center gap-2 text-xs font-bold text-brand-slate hover:text-brand-primary"
          >
            <ChevronLeft size={16} /> Back to Student Directory
          </Link>
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-sm font-bold text-red-700 flex items-center gap-3">
            <AlertCircle size={20} />
            {error || "Student profile was not found in Firestore."}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const student = selectedStudent;
  const analysis = selectedAnalysis;
  const interview = selectedInterview;

  // Stored resume evaluation values (strictly from authoritative record)
  const storedAts = analysis?.atsScore?.overallScore;
  const storedAlignment = analysis?.alignmentScore?.overallScore;
  const storedResumeScore =
    analysis?.resumeScore?.overallScore ?? analysis?.overallScore ?? student.resumeScore;

  // Stored alignment breakdown components (no synthetic defaults)
  const alignmentBreakdown = analysis?.alignmentScore?.breakdown;
  const skillsMatch = alignmentBreakdown?.skillsMatch;
  const experienceProjects = alignmentBreakdown?.experienceProjects;
  const educationRelevance = alignmentBreakdown?.educationRelevance;
  const certifications = alignmentBreakdown?.certifications;

  // Stored interview evaluation values
  const storedInterviewScore =
    interview?.finalReport?.overallPerformance ??
    interview?.overallScore ??
    student.interviewScore;
  const interviewCategories = interview?.finalReport?.categoryBreakdown;
  const interviewStrengths = interview?.finalReport?.strengths;
  const interviewWeaknesses = interview?.finalReport?.areasToImprove;

  // Employability score: strictly show only when both evaluations are complete
  const isFullyPrepared =
    storedResumeScore !== undefined &&
    storedInterviewScore !== undefined &&
    student.interviewStatus === "completed";
  const canonicalEmployabilityScore = isFullyPrepared ? student.employabilityScore : undefined;

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        {/* Navigation header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <Link
            href={directoryHref}
            className="flex items-center gap-2 text-xs font-black text-brand-slate hover:text-brand-primary transition-all uppercase tracking-wider"
          >
            <ChevronLeft size={16} /> Back to Student Directory
          </Link>
          <span className="text-xs font-bold text-brand-slate min-w-0 break-all">
            Student UID:{" "}
            <code className="bg-gray-150 px-2 py-1 rounded text-brand-primary font-mono text-[11px]">
              {student.uid}
            </code>
          </span>
        </div>

        {/* Profile Summary Banner */}
        <div className="figma-card p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-brand-primary border border-gray-200">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-16 w-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-black text-2xl shrink-0">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-[#1E3E6B]">{student.fullName}</h1>
                {(student.isDefenseDemo || student.isSyntheticUat) && <span className="text-xs font-semibold text-brand-slate">Test / demo account</span>}
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-black border ${
                    student.isDisabled
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {student.isDisabled ? "Account Disabled" : "Active Student"}
                </span>
                {student.coordinator && (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Coordinator: {student.coordinator}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-brand-slate break-all">{student.email}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-brand-slate pt-1">
                <span className="flex items-center gap-1">
                  <Briefcase size={14} className="text-brand-primary" /> {student.degreeProgram}
                </span>
                <span>•</span>
                <span>{student.college}</span>
                <span>•</span>
                <span className="text-brand-primary font-extrabold">
                  Target Role: {student.targetPosition || "Not specified"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end text-xs font-semibold text-brand-slate gap-1 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 shrink-0">
            <div>
              Registered:{" "}
              <span className="font-extrabold text-[#1E3E6B]">
                {new Date(student.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              Last Active:{" "}
              <span className="font-extrabold text-[#1E3E6B]">
                {new Date(student.lastActivityDate || student.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Authoritative Performance Triad Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Resume Score Card */}
          <div className="figma-card p-6 bg-white space-y-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-slate">
                Resume Score
              </span>
              <FileText size={20} className="text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1E3E6B]">
                {storedResumeScore !== undefined ? storedResumeScore : "Not Evaluated"}
              </span>
              {storedResumeScore !== undefined && (
                <span className="text-xs font-bold text-brand-slate">/ 100</span>
              )}
            </div>
            <div className="text-xs font-bold text-brand-slate flex flex-wrap gap-2 pt-1 border-t border-gray-100">
              <span>ATS: {storedAts !== undefined ? `${storedAts}/100` : "N/A"}</span>
              <span>•</span>
              <span>Alignment: {storedAlignment !== undefined ? `${storedAlignment}/100` : "N/A"}</span>
            </div>
          </div>

          {/* 2. Interview Score Card */}
          <div className="figma-card p-6 bg-white space-y-3 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-slate">
                Mock Interview Score
              </span>
              <Activity size={20} className="text-teal-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#1E3E6B]">
                {storedInterviewScore !== undefined ? storedInterviewScore : "Not Evaluated"}
              </span>
              {storedInterviewScore !== undefined && (
                <span className="text-xs font-bold text-brand-slate">/ 100</span>
              )}
            </div>
            <div className="text-xs font-bold text-brand-slate pt-1 border-t border-gray-100">
              {student.interviewStatus === "completed" ? (
                <span className="text-teal-700 font-extrabold">Interview Completed</span>
              ) : student.interviewStatus === "in_progress" ? (
                <span className="text-amber-700 font-extrabold">Interview In Progress</span>
              ) : (
                <span className="text-gray-400">Interview Not Started</span>
              )}
            </div>
          </div>

          {/* 3. Employability Index Card */}
          <div className="figma-card p-6 bg-white space-y-3 border-2 border-brand-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-primary">
                Employability Index
              </span>
              <Award size={20} className="text-brand-orange" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand-primary">
                {canonicalEmployabilityScore !== undefined
                  ? canonicalEmployabilityScore
                  : "Incomplete Data"}
              </span>
              {canonicalEmployabilityScore !== undefined && (
                <span className="text-xs font-bold text-brand-slate">/ 100</span>
              )}
            </div>
            <div className="text-xs font-bold text-brand-slate pt-1 border-t border-gray-100">
              {canonicalEmployabilityScore !== undefined ? (
                canonicalEmployabilityScore >= 80 ? (
                  <span className="text-teal-700 font-extrabold">High Market Preparedness</span>
                ) : canonicalEmployabilityScore >= 60 ? (
                  <span className="text-blue-700 font-extrabold">Moderate Preparedness</span>
                ) : (
                  <span className="text-amber-700 font-extrabold">Needs Skills Remediation</span>
                )
              ) : (
                <span className="text-amber-700 font-extrabold">
                  Requires both Resume & Interview evaluations
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Detailed Resume Analysis Breakdown */}
        <div className="figma-card p-6 bg-white space-y-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-black text-[#1E3E6B] flex items-center gap-2">
                <FileText size={18} className="text-purple-600" /> Stored Resume Evaluation
              </h2>
              <p className="text-xs font-semibold text-brand-slate mt-0.5">
                Canonical payload evaluated against target role:{" "}
                <span className="text-brand-primary font-bold">
                  {analysis?.alignmentScore?.targetPosition || student.targetPosition || "Unspecified"}
                </span>
              </p>
            </div>
            {analysis?.analyzedAt && (
              <span className="text-xs font-bold text-brand-slate flex items-center gap-1">
                <Clock size={13} className="text-brand-primary" /> Analyzed:{" "}
                {new Date(analysis.analyzedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {!analysis ? (
            <div className="p-8 text-center text-xs font-bold text-brand-slate bg-gray-50 rounded-2xl">
              No resume analysis record found in Firestore for this student.
            </div>
          ) : (
            <div className="space-y-5">
              {/* 4 Role Alignment Components */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-slate mb-3 flex items-center gap-1.5">
                  <Layers size={14} /> Role Alignment Component Scores
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Skills Match */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-xs font-bold text-brand-slate">Skills Match</span>
                    <div className="text-xl font-black text-[#1E3E6B]">
                      {skillsMatch ? `${skillsMatch.rawScore} / 100` : "N/A"}
                    </div>
                    <span className="text-[10px] text-brand-slate block">
                      Weight: {skillsMatch ? `${Math.round(skillsMatch.weight * 100)}%` : "30%"}
                    </span>
                  </div>

                  {/* Experience & Projects */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-xs font-bold text-brand-slate">Experience & Projects</span>
                    <div className="text-xl font-black text-[#1E3E6B]">
                      {experienceProjects ? `${experienceProjects.rawScore} / 100` : "N/A"}
                    </div>
                    <span className="text-[10px] text-brand-slate block">
                      Weight: {experienceProjects ? `${Math.round(experienceProjects.weight * 100)}%` : "40%"}
                    </span>
                  </div>

                  {/* Education Relevance */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-xs font-bold text-brand-slate">Education Relevance</span>
                    <div className="text-xl font-black text-[#1E3E6B]">
                      {educationRelevance ? `${educationRelevance.rawScore} / 100` : "N/A"}
                    </div>
                    <span className="text-[10px] text-brand-slate block">
                      Weight: {educationRelevance ? `${Math.round(educationRelevance.weight * 100)}%` : "20%"}
                    </span>
                  </div>

                  {/* Certifications */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-xs font-bold text-brand-slate">Certifications</span>
                    <div className="text-xl font-black text-[#1E3E6B]">
                      {certifications ? `${certifications.rawScore} / 100` : "N/A"}
                    </div>
                    <span className="text-[10px] text-brand-slate block">
                      Weight: {certifications ? `${Math.round(certifications.weight * 100)}%` : "10%"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detected Skills */}
              {analysis.detectedSkills && analysis.detectedSkills.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-slate mb-2">
                    Detected Candidate Skills ({analysis.detectedSkills.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.detectedSkills.map((skill: any, idx: number) => {
                      const label =
                        typeof skill === "string"
                          ? skill
                          : skill?.name || skill?.skill || JSON.stringify(skill);
                      return (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-[#1E3E6B] border border-blue-200"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Improvement Suggestions */}
              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-slate mb-3">
                    Evaluation Suggestions & Actionable Recommendations ({analysis.suggestions.length})
                  </h3>
                  <div className="space-y-3">
                    {analysis.suggestions.map((sug: any, idx: number) => {
                      if (typeof sug === "string") {
                        return (
                          <div
                            key={idx}
                            className="p-3.5 bg-gray-50 rounded-xl border border-gray-150 text-xs font-semibold text-brand-slate leading-relaxed flex items-start gap-2"
                          >
                            <span className="text-brand-primary font-black">•</span>
                            <span>{sug}</span>
                          </div>
                        );
                      }

                      const priority = sug?.priority ? String(sug.priority).toLowerCase() : undefined;
                      const priorityColor =
                        priority === "critical" || priority === "high"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : priority === "medium"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200";

                      return (
                        <div
                          key={sug?.id || idx}
                          className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {sug?.section && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-gray-200 text-gray-700">
                                  {sug.section}
                                </span>
                              )}
                              <span className="font-extrabold text-[#1E3E6B]">
                                {sug?.title || sug?.action || "Improvement Recommendation"}
                              </span>
                            </div>
                            {sug?.priority && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${priorityColor}`}
                              >
                                {sug.priority} Priority
                              </span>
                            )}
                          </div>

                          {(sug?.why || sug?.reason) && (
                            <p className="text-brand-slate font-medium leading-relaxed">
                              {sug.why || sug.reason}
                            </p>
                          )}

                          {sug?.action && sug?.title && (
                            <div className="p-2.5 bg-white rounded-lg border border-gray-200 text-brand-slate font-semibold leading-relaxed">
                              <span className="text-[#1E3E6B] font-bold">Action: </span>
                              {sug.action}
                            </div>
                          )}

                          {sug?.example && (
                            <div className="p-2 bg-gray-100/70 rounded border border-gray-200 font-mono text-[11px] text-gray-700">
                              <span className="font-sans font-bold text-gray-500">Example: </span>
                              {sug.example}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Detailed Interview Simulation Breakdown */}
        <div className="figma-card p-6 bg-white space-y-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-black text-[#1E3E6B] flex items-center gap-2">
                <Activity size={18} className="text-teal-600" /> Stored Mock Interview Evaluation
              </h2>
              <p className="text-xs font-semibold text-brand-slate mt-0.5">
                Session data from voice-simulated interview:{" "}
                <span className="text-brand-primary font-bold">
                  {interview?.targetRole || student.targetPosition || "Interactive Session"}
                </span>
              </p>
            </div>
            {interview?.completedAt && (
              <span className="text-xs font-bold text-brand-slate flex items-center gap-1">
                <Calendar size={13} className="text-brand-primary" /> Completed:{" "}
                {new Date(interview.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {!interview ? (
            <div className="p-8 text-center text-xs font-bold text-brand-slate bg-gray-50 rounded-2xl">
              No completed interview session record found for this student account.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Category Scores */}
              {interviewCategories && (
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-slate mb-3">
                    Evaluation Category Breakdown
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                      <span className="text-xs font-bold text-brand-slate">Semantic Correctness</span>
                      <div className="text-xl font-black text-[#1E3E6B]">
                        {interviewCategories.SemanticCorrectness !== undefined
                          ? `${interviewCategories.SemanticCorrectness} / 100`
                          : "N/A"}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                      <span className="text-xs font-bold text-brand-slate">AI Holistic Evaluation</span>
                      <div className="text-xl font-black text-[#1E3E6B]">
                        {interviewCategories.AIHolisticEvaluation !== undefined
                          ? `${interviewCategories.AIHolisticEvaluation} / 100`
                          : "N/A"}
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                      <span className="text-xs font-bold text-brand-slate">Communication Clarity</span>
                      <div className="text-xl font-black text-[#1E3E6B]">
                        {interviewCategories.CommunicationClarity !== undefined
                          ? `${interviewCategories.CommunicationClarity} / 100`
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {interviewStrengths && interviewStrengths.length > 0 && (
                  <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Demonstrated Strengths
                    </span>
                    <ul className="space-y-1 text-xs font-semibold text-teal-900 list-disc list-inside">
                      {interviewStrengths.map((st: any, idx: number) => (
                        <li key={idx}>
                          {typeof st === "string" ? st : st?.strength || st?.title || st?.description || JSON.stringify(st)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {interviewWeaknesses && interviewWeaknesses.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Areas for Improvement
                    </span>
                    <ul className="space-y-1 text-xs font-semibold text-amber-900 list-disc list-inside">
                      {interviewWeaknesses.map((wk: any, idx: number) => (
                        <li key={idx}>
                          {typeof wk === "string" ? wk : wk?.area || wk?.title || wk?.description || wk?.weakness || JSON.stringify(wk)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Chronological Improvement Timeline */}
        <div className="figma-card p-6 bg-white space-y-6 border border-gray-200">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-black text-[#1E3E6B] flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-primary" /> Chronological Evaluation Timeline
            </h2>
            <p className="text-xs font-semibold text-brand-slate mt-0.5">
              Historical progression across resume versions and mock interview attempts. Deltas are calculated strictly within the same metric.
            </p>
          </div>

          {!scoreHistory || scoreHistory.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-brand-slate bg-gray-50 rounded-2xl">
              No historical evaluation events recorded for this student account.
            </div>
          ) : (
            <div className="relative border-l-2 border-brand-primary/20 ml-4 space-y-5 pl-6 py-2">
              {scoreHistory.map((item) => (
                <div key={item.id} className="relative">
                  <div
                    className={`absolute -left-[31px] top-1 h-5 w-5 rounded-full border-2 bg-white flex items-center justify-center ${
                      item.type === "resume"
                        ? "border-purple-500 text-purple-500"
                        : "border-teal-500 text-teal-500"
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full bg-current" />
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-extrabold text-[#1E3E6B] text-sm break-words">{item.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            item.type === "resume"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-teal-100 text-teal-800"
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-brand-slate flex items-center gap-1">
                        <Calendar size={12} /> {new Date(item.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 min-w-0">
                      <div className="text-xs font-semibold text-brand-slate break-words min-w-0">{item.details}</div>
                      <div className="flex flex-wrap items-center gap-3 shrink-0">
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

        <div className="figma-card p-6 bg-white space-y-5 border border-gray-200">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-black text-[#1E3E6B] flex items-center gap-2">
              <Clock size={18} className="text-brand-primary" /> Recorded Activity History
            </h2>
            <p className="text-xs font-semibold text-brand-slate mt-0.5">
              Events recorded for this student account with an actual timestamp.
            </p>
          </div>
          {activityLogs.length === 0 ? (
            <p className="p-6 text-center text-xs font-bold text-brand-slate bg-gray-50 rounded-2xl">
              No dated activity records found for this student account.
            </p>
          ) : (
            <ol className="relative border-l-2 border-brand-primary/20 ml-4 space-y-4 pl-6 py-2">
              {activityLogs.map((event) => (
                <li key={event.id} className="relative min-w-0">
                  <span className="absolute -left-[31px] top-1 h-5 w-5 rounded-full border-2 border-brand-primary bg-white" aria-hidden="true" />
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                      <span className="text-sm font-extrabold text-[#1E3E6B] break-words">{event.action}</span>
                      <time className="text-xs font-bold text-brand-slate shrink-0" dateTime={event.timestamp}>
                        {new Date(event.timestamp).toLocaleDateString()}
                      </time>
                    </div>
                    {event.details && <p className="text-xs font-semibold text-brand-slate mt-2 break-words">{event.details}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
