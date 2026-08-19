"use client";

import React, { useEffect, use } from "react";
import { DashboardLayout } from "../../../components/layouts/DashboardLayout";
import { useStudentStore } from "../../../store/studentStore";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { ChevronLeft, User, CheckCircle2, AlertCircle, BookOpen, Briefcase, Sparkles } from "lucide-react";
import Link from "next/link";

export default function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;

  const {
    selectedStudent,
    selectedAnalysis,
    selectedResume,
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
        <div className="flex h-[60vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !selectedStudent) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Link
            href="/students"
            className="flex items-center gap-2 text-xs font-bold text-brand-slate hover:text-brand-primary"
          >
            <ChevronLeft size={16} /> Back to Students
          </Link>
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-sm font-bold text-red-700 flex items-center gap-3">
            <AlertCircle size={20} />
            {error || "Student profile was not found."}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const overallScore = selectedAnalysis?.result?.atsScore?.overallScore ?? 0;
  const compatibilityLevel = selectedAnalysis?.result?.atsScore?.level ?? "NotAnalyzed";
  const breakdown = selectedAnalysis?.result?.atsScore?.breakdown ?? {};

  const levelLabels: Record<string, string> = {
    ExcellentMatch: "Excellent Match",
    StrongFoundation: "Strong Foundation",
    GettingThere: "Getting There",
    NeedsImprovement: "Needs Improvement",
    NotAnalyzed: "Not Evaluated",
  };

  const levelColors: Record<string, string> = {
    ExcellentMatch: "bg-teal-50 border-teal-200 text-teal-700",
    StrongFoundation: "bg-blue-50 border-blue-200 text-blue-700",
    GettingThere: "bg-amber-50 border-amber-200 text-amber-700",
    NeedsImprovement: "bg-red-50 border-red-200 text-red-700",
    NotAnalyzed: "bg-gray-50 border-gray-250 text-gray-700",
  };

  // Structured content chunks from Firestore resumes document
  const educationList = selectedResume?.structuredData?.education || [];
  const experienceList = selectedResume?.structuredData?.workExperience || [];
  const skillsList = selectedResume?.structuredData?.skills || [];
  const certificationsList = selectedResume?.structuredData?.certifications || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <Link
            href="/students"
            className="flex items-center gap-2 text-xs font-bold text-brand-slate hover:text-brand-primary transition-all uppercase tracking-wider"
          >
            <ChevronLeft size={16} /> Back to Student Directory
          </Link>
        </div>

        {/* Student personal details profile banner */}
        <div className="figma-card p-6 flex flex-col md:flex-row md:items-center gap-6 bg-white">
          <div className="h-14 w-14 bg-teal-50 rounded-full flex items-center justify-center border border-teal-200 text-teal-600">
            <User size={26} />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="text-xl font-extrabold text-brand-primary">{selectedStudent.fullName}</h2>
            <p className="text-xs font-bold text-brand-slate">{selectedStudent.email}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs font-semibold text-[#1E3E6B]">
              <span>
                College: <strong className="text-brand-primary font-bold">{selectedStudent.college}</strong>
              </span>
              <span>
                Degree Track: <strong className="text-brand-primary font-bold">{selectedStudent.degreeProgram}</strong>
              </span>
              <span>
                Target Career: <strong className="text-brand-primary font-bold">{selectedStudent.targetPosition}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Scores & Resume Section split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Resume Scoring details */}
          <div className="lg:col-span-1 space-y-6">
            <div className="figma-card p-6 space-y-5 bg-white">
              <h3 className="text-sm font-extrabold text-brand-primary uppercase tracking-wider">Resume Rating</h3>

              {selectedStudent.hasUploadedResume ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-brand-primary">{overallScore}/100</span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wide ${
                        levelColors[compatibilityLevel] || levelColors.NotAnalyzed
                      }`}
                    >
                      {levelLabels[compatibilityLevel] || compatibilityLevel}
                    </span>
                  </div>

                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-wide">Breakdown</h4>
                    <div className="space-y-2 text-xs font-semibold text-brand-slate">
                      <div className="flex justify-between">
                        <span>Skills Compatibility</span>
                        <span className="text-brand-primary font-bold">{breakdown.skillsMatchScore ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Experience Track</span>
                        <span className="text-brand-primary font-bold">{breakdown.experienceScore ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Education Profile</span>
                        <span className="text-brand-primary font-bold">{breakdown.educationRelevanceScore ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Certifications List</span>
                        <span className="text-brand-primary font-bold">{breakdown.certificationsScore ?? 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-bold text-brand-slate">
                  This student has not uploaded or parsed their resume yet.
                </div>
              )}
            </div>

            {/* Suggested Improvements */}
            {selectedStudent.hasUploadedResume && selectedAnalysis?.result?.suggestions && (
              <div className="figma-card p-6 space-y-4 bg-white">
                <h3 className="text-sm font-extrabold text-brand-primary uppercase tracking-wide">Action Items</h3>
                <div className="space-y-3">
                  {selectedAnalysis.result.suggestions.slice(0, 4).map((s: any, idx: number) => (
                    <div key={idx} className="flex gap-2.5 text-xs font-semibold text-brand-slate leading-relaxed border-b border-gray-100 pb-2">
                      <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-brand-primary block font-bold">{s.title}</strong>
                        {s.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Parsed dynamic content displays */}
          <div className="figma-card lg:col-span-2 p-6 space-y-5 bg-white">
            <h3 className="text-sm font-extrabold text-brand-primary uppercase tracking-wide">Parsed Resume</h3>

            {selectedStudent.hasUploadedResume && selectedResume ? (
              <div className="space-y-6">

                {/* Academic Background */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-wider">
                    <BookOpen size={16} />
                    <span>Education Background</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-200 space-y-3 max-h-48 overflow-y-auto">
                    {educationList.length > 0 ? (
                      educationList.map((edu: any, idx: number) => (
                        <div key={idx} className="text-xs border-b border-gray-100 last:border-none pb-2 last:pb-0">
                          <strong className="text-[#1E3E6B] font-bold">{edu.degree || "Degree"}</strong>
                          <span className="text-brand-slate block">{edu.school || "School"} {edu.date ? `(${edu.date})` : ""}</span>
                          {edu.gpa ? <span className="text-[10px] text-teal-600 font-semibold">GPA: {edu.gpa}</span> : null}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-brand-slate font-medium">No education entries parsed.</span>
                    )}
                  </div>
                </div>

                {/* Professional Experience */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-wider">
                    <Briefcase size={16} />
                    <span>Work Experience</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-200 space-y-3 max-h-48 overflow-y-auto">
                    {experienceList.length > 0 ? (
                      experienceList.map((exp: any, idx: number) => (
                        <div key={idx} className="text-xs border-b border-gray-100 last:border-none pb-2 last:pb-0">
                          <strong className="text-[#1E3E6B] font-bold">{exp.role || "Role"}</strong>
                          <span className="text-brand-slate block">{exp.company || "Company"} {exp.date ? `(${exp.date})` : ""}</span>
                          {exp.responsibilities && (
                            <p className="text-[11px] text-brand-slate/85 mt-1 leading-relaxed whitespace-pre-line">{exp.responsibilities}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-brand-slate font-medium">No work experience parsed.</span>
                    )}
                  </div>
                </div>

                {/* Technical Skills & Competencies */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-primary uppercase tracking-wider">
                    <Sparkles size={16} />
                    <span>Skills & Certifications</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-200 max-h-48 overflow-y-auto">
                    {skillsList.length > 0 || certificationsList.length > 0 ? (
                      <div className="space-y-3">
                        {skillsList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {skillsList.map((skill: string, idx: number) => (
                              <span key={idx} className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        {certificationsList.length > 0 && (
                          <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
                            <span className="text-[9px] font-black text-brand-slate uppercase block mb-1">Certifications</span>
                            {certificationsList.map((cert: any, idx: number) => (
                              <div key={idx} className="text-brand-slate font-medium">
                                • {cert.name || cert}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-brand-slate font-medium">No skills detected.</span>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex h-64 items-center justify-center border border-dashed border-gray-200 rounded-2xl text-xs font-bold text-brand-slate p-6">
                Resume content structure is not available for this profile.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
