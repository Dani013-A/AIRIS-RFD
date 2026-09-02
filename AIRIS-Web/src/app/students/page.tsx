"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useStudentStore } from "../../store/studentStore";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";
import Link from "next/link";
import { Search, Eye, Power, Trash2, Filter, ChevronLeft, ChevronRight, ChevronDown, User, AlertTriangle, Briefcase, Calendar } from "lucide-react";

export default function StudentsPage() {
  const { currentAdmin } = useAuthStore();
  const {
    students,
    loading,
    actionLoading,
    error,
    loadStudents,
    toggleAccountStatus,
    deleteStudent,
  } = useStudentStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [resumeStatusFilter, setResumeStatusFilter] = useState<"all" | "success" | "missing">("all");
  const [scoreFilter, setScoreFilter] = useState<"all" | "high" | "moderate" | "low" | "none">("all");
  const [collegeFilter, setCollegeFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleToggleStatus = async (studentId: string, currentDisabled: boolean) => {
    if (!currentAdmin) return;
    try {
      await toggleAccountStatus(studentId, !currentDisabled, currentAdmin.fullName || "Admin");
    } catch {
      alert("Failed to modify user status.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudentId || !currentAdmin) return;
    try {
      await deleteStudent(selectedStudentId, currentAdmin.fullName || "Admin");
      setIsDeleteModalOpen(false);
      setSelectedStudentId(null);
    } catch {
      alert("Failed to delete student account.");
    }
  };

  const openDeletePrompt = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsDeleteModalOpen(true);
  };

  // Filter students based on all criteria
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.degreeProgram || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.targetPosition || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (accountStatusFilter === "active" && s.isDisabled) return false;
    if (accountStatusFilter === "disabled" && !s.isDisabled) return false;

    if (resumeStatusFilter === "success" && !s.hasUploadedResume) return false;
    if (resumeStatusFilter === "missing" && s.hasUploadedResume) return false;

    const score = s.employabilityScore ?? 0;
    if (scoreFilter === "high" && score < 80) return false;
    if (scoreFilter === "moderate" && (score < 60 || score >= 80)) return false;
    if (scoreFilter === "low" && (score === 0 || score >= 60)) return false;
    if (scoreFilter === "none" && score > 0) return false;

    if (collegeFilter !== "all" && s.college !== collegeFilter) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const uniqueColleges = Array.from(new Set(students.map((s) => s.college).filter(Boolean)));

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Student Directory</h1>
            <p className="text-sm font-semibold text-brand-slate mt-0.5">
              Manage registered student accounts, inspect evaluation scores, and monitor employability metrics.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Total Students: {students.length}
            </span>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Active: {students.filter((s) => !s.isDisabled).length}
            </span>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="figma-card p-4 bg-white space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Search Input */}
            <div className="figma-input-container flex-1 w-full">
              <Search size={18} className="text-brand-slate mr-3" />
              <input
                type="text"
                placeholder="Search by student name, TIP email, program track, or target role..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm font-semibold bg-transparent border-none outline-none text-[#1E3E6B]"
              />
            </div>
          </div>

          {/* Filter Dropdowns Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs font-bold text-brand-slate">
            <div className="flex items-center gap-1 text-gray-500 font-bold text-xs h-9 shrink-0">
              <Filter size={14} /> Filter By:
            </div>

            {/* Account Status Filter */}
            <div className="relative inline-flex items-center">
              <select
                value={accountStatusFilter}
                onChange={(e) => {
                  setAccountStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                aria-label="Filter by account status"
                className="appearance-none h-9 pl-3.5 pr-7 rounded-xl border border-gray-250 bg-gray-50 text-xs font-bold text-[#1E3E6B] outline-none focus:border-brand-primary cursor-pointer hover:bg-gray-100/80 transition-all shadow-2xs"
              >
                <option value="all">Account: All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="disabled">Disabled Accounts</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-[#1E3E6B] opacity-80" />
            </div>

            {/* Resume Status Filter */}
            <div className="relative inline-flex items-center">
              <select
                value={resumeStatusFilter}
                onChange={(e) => {
                  setResumeStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                aria-label="Filter by resume status"
                className="appearance-none h-9 pl-3.5 pr-7 rounded-xl border border-gray-250 bg-gray-50 text-xs font-bold text-[#1E3E6B] outline-none focus:border-brand-primary cursor-pointer hover:bg-gray-100/80 transition-all shadow-2xs"
              >
                <option value="all">Resume: All</option>
                <option value="success">Uploaded Resume</option>
                <option value="missing">Missing Resume</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-[#1E3E6B] opacity-80" />
            </div>

            {/* Score Range Filter */}
            <div className="relative inline-flex items-center">
              <select
                value={scoreFilter}
                onChange={(e) => {
                  setScoreFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                aria-label="Filter by employability score"
                className="appearance-none h-9 pl-3.5 pr-7 rounded-xl border border-gray-250 bg-gray-50 text-xs font-bold text-[#1E3E6B] outline-none focus:border-brand-primary cursor-pointer hover:bg-gray-100/80 transition-all shadow-2xs"
              >
                <option value="all">Employability: All Scores</option>
                <option value="high">High Preparedness (80–100)</option>
                <option value="moderate">Moderate Preparedness (60–79)</option>
                <option value="low">Needs Remediation (&lt;60)</option>
                <option value="none">Not Evaluated (0)</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-[#1E3E6B] opacity-80" />
            </div>

            {/* College Filter */}
            {uniqueColleges.length > 0 && (
              <div className="relative inline-flex items-center">
                <select
                  value={collegeFilter}
                  onChange={(e) => {
                    setCollegeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by college"
                  className="appearance-none h-9 pl-3.5 pr-7 rounded-xl border border-gray-250 bg-gray-50 text-xs font-bold text-[#1E3E6B] outline-none focus:border-brand-primary cursor-pointer hover:bg-gray-100/80 transition-all shadow-2xs"
                >
                  <option value="all">College: All Domains</option>
                  {uniqueColleges.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-[#1E3E6B] opacity-80" />
              </div>
            )}

            {(searchQuery || accountStatusFilter !== "all" || resumeStatusFilter !== "all" || scoreFilter !== "all" || collegeFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setAccountStatusFilter("all");
                  setResumeStatusFilter("all");
                  setScoreFilter("all");
                  setCollegeFilter("all");
                  setCurrentPage(1);
                }}
                className="text-xs text-brand-primary underline hover:text-brand-orange ml-auto cursor-pointer flex items-center h-9"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Directory Container */}
        <div className="figma-card overflow-hidden bg-white">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 gap-3">
              <LoadingSpinner size="md" />
              <p className="text-xs font-bold text-brand-slate">Querying Firebase student records...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm font-bold text-red-600 bg-red-50">
              {error}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm font-bold text-brand-slate">
              <User size={36} className="text-gray-300 mb-2" />
              No student profiles found matching your search or filter criteria.
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1300px]">
                  <thead>
                    <tr className="bg-[#DCE6EE]/30 border-b border-[#A5C2DA]/30 text-xs font-black uppercase tracking-wider text-brand-primary">
                      <th className="px-5 py-4 min-w-[200px] text-left whitespace-nowrap">Student Profile</th>
                      <th className="px-5 py-4 min-w-[200px] text-left whitespace-nowrap">TIP Email</th>
                      <th className="px-5 py-4 min-w-[180px] text-left whitespace-nowrap">Academic Program</th>
                      <th className="px-5 py-4 min-w-[150px] text-left whitespace-nowrap">Target Career</th>
                      <th className="px-5 py-4 min-w-[140px] text-left whitespace-nowrap">Resume Status</th>
                      <th className="px-5 py-4 min-w-[130px] text-left whitespace-nowrap">Resume Score</th>
                      <th className="px-5 py-4 min-w-[140px] text-left whitespace-nowrap">Interview Status</th>
                      <th className="px-5 py-4 min-w-[130px] text-left whitespace-nowrap">Interview Score</th>
                      <th className="px-5 py-4 min-w-[160px] text-left whitespace-nowrap">Employability Score</th>
                      <th className="px-5 py-4 min-w-[130px] text-left whitespace-nowrap">Account Status</th>
                      <th className="px-5 py-4 min-w-[150px] text-left whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-bold">
                    {paginatedStudents.map((student) => {
                      const empScore = student.employabilityScore;
                      const hasEmpScore = empScore !== undefined && empScore > 0;
                      const empBadgeColor = hasEmpScore
                        ? empScore >= 80
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : empScore >= 60
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-100 text-gray-500 border-gray-200";

                      const rScore = student.resumeScore ?? 0;
                      const rBadgeColor = rScore >= 80
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : rScore >= 60
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : rScore > 0
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-100 text-gray-500 border-gray-200";

                      const iScore = student.interviewStatus === "completed" ? (student.interviewScore ?? 0) : 0;
                      const iBadgeColor = iScore >= 80
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : iScore >= 60
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : iScore > 0
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-100 text-gray-500 border-gray-200";

                      return (
                        <tr key={student.uid} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-4 text-left">
                            <div className="flex items-center justify-end gap-3 text-left">
                              <div className="text-left">
                                <span className="font-extrabold text-[#1E3E6B] text-sm block whitespace-nowrap">
                                  {student.fullName}
                                </span>
                                <span className="text-[11px] text-brand-slate font-semibold whitespace-nowrap block">
                                  Registered {new Date(student.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="h-9 w-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-black text-xs shrink-0">
                                {student.fullName.charAt(0).toUpperCase()}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-brand-slate font-medium whitespace-nowrap text-left">{student.email}</td>
                          <td className="px-5 py-4 text-left">
                            <span className="block font-bold text-[#1E3E6B]">{student.degreeProgram}</span>
                            <span className="text-[11px] text-brand-slate block font-normal">{student.college}</span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-brand-slate text-left">
                            {student.targetPosition || "Not set"}
                          </td>

                          {/* 1. Resume Status */}
                          <td className="px-5 py-4 text-left whitespace-nowrap">
                            {student.hasUploadedResume ? (
                              <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                                Uploaded {student.resumesCount ? `(${student.resumesCount})` : ""}
                              </span>
                            ) : (
                              <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-extrabold bg-gray-100 text-gray-500 border border-gray-200">
                                Missing Resume
                              </span>
                            )}
                          </td>

                          {/* 2. Resume Score */}
                          <td className="px-5 py-4 text-left whitespace-nowrap">
                            <span className={`whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border ${rBadgeColor}`}>
                              {rScore > 0 ? `${rScore} / 100` : "Not Evaluated"}
                            </span>
                          </td>

                          {/* 3. Interview Status */}
                          <td className="px-5 py-4 text-left whitespace-nowrap">
                            {student.interviewStatus === "completed" ? (
                              <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                                Completed ({student.interviewsCount ?? 1})
                              </span>
                            ) : (
                              <span className="whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-extrabold bg-gray-100 text-gray-500 border border-gray-200">
                                Not Started
                              </span>
                            )}
                          </td>

                          {/* 4. Interview Score */}
                          <td className="px-5 py-4 text-left whitespace-nowrap">
                            <span className={`whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border ${iBadgeColor}`}>
                              {iScore > 0 ? `${iScore} / 100` : "Not Evaluated"}
                            </span>
                          </td>

                          {/* 5. Employability Score */}
                          <td className="px-5 py-4 text-left whitespace-nowrap">
                            <span className={`whitespace-nowrap inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border ${empBadgeColor}`}>
                              {hasEmpScore ? `${empScore} / 100` : "Not Yet Evaluated"}
                            </span>
                          </td>

                          {/* Account Status */}
                          <td className="px-5 py-4 text-left whitespace-nowrap">
                            <button
                              onClick={() => handleToggleStatus(student.uid, !!student.isDisabled)}
                              disabled={actionLoading}
                              className={`whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                                student.isDisabled
                                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              <Power size={12} />
                              {student.isDisabled ? "Disabled" : "Active"}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-left whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/students/${student.uid}`}
                                className="px-3 py-1.5 rounded-xl bg-brand-primary/10 text-brand-primary font-extrabold hover:bg-brand-primary/20 transition-all inline-flex items-center gap-1 text-xs whitespace-nowrap"
                              >
                                <Eye size={14} /> Profile
                              </Link>
                              <button
                                onClick={() => openDeletePrompt(student.uid)}
                                disabled={actionLoading}
                                aria-label="Delete Student Account"
                                className="p-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Student Cards View (< 768px) */}
              <div className="block md:hidden divide-y divide-gray-100">
                {paginatedStudents.map((student) => {
                  const score = student.employabilityScore ?? 0;
                  const scoreBadgeColor =
                    score >= 80
                      ? "bg-teal-50 text-teal-700 border-teal-200"
                      : score >= 60
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : score > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-gray-100 text-gray-500 border-gray-200";

                  return (
                    <div key={student.uid} className="p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-black text-sm shrink-0">
                            {student.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-[#1E3E6B] text-base">{student.fullName}</h3>
                            <p className="text-xs font-semibold text-brand-slate">{student.email}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black border ${scoreBadgeColor}`}>
                          {score > 0 ? `${score} / 100` : "Not Evaluated"}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-brand-slate space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-150">
                        <div className="flex justify-between">
                          <span>Program:</span>
                          <span className="text-[#1E3E6B] font-extrabold">{student.degreeProgram}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Target Role:</span>
                          <span className="text-brand-primary font-extrabold">{student.targetPosition || "Not set"}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(student.uid, !!student.isDisabled)}
                            disabled={actionLoading}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
                              student.isDisabled
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            <Power size={12} />
                            {student.isDisabled ? "Disabled" : "Active"}
                          </button>

                          {student.hasUploadedResume && (
                            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                              Resumes ({student.resumesCount ?? 1})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/students/${student.uid}`}
                            className="px-3.5 py-1.5 rounded-xl bg-brand-primary text-white font-extrabold text-xs inline-flex items-center gap-1"
                          >
                            <Eye size={14} /> Profile
                          </Link>
                          <button
                            onClick={() => openDeletePrompt(student.uid)}
                            disabled={actionLoading}
                            className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom-right Registered & Latest Activity timestamps */}
                      <div className="flex items-center justify-between text-[11px] font-semibold text-brand-slate pt-2 border-t border-gray-100">
                        <span className="text-gray-400 font-bold">Activity Record</span>
                        <div className="text-right space-y-0.5">
                          <div>Registered: <span className="font-extrabold text-[#1E3E6B]">{new Date(student.createdAt).toLocaleDateString()}</span></div>
                          <div>Latest Act: <span className="font-extrabold text-[#1E3E6B]">{new Date(student.lastActivityDate || student.updatedAt).toLocaleDateString()}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {!loading && filteredStudents.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 text-xs font-bold text-brand-slate bg-gray-50/50 gap-3">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-gray-250 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="px-3 py-1.5 font-extrabold text-[#1E3E6B]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-gray-250 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Student Account Deletion"
        >
          <div className="space-y-4 text-xs font-semibold text-brand-slate">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
              <AlertTriangle size={18} />
              <span>This action is permanent and will remove the student profile from Firestore.</span>
            </div>
            <p>Are you sure you want to permanently delete this student account?</p>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-250 text-brand-slate font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-extrabold hover:bg-red-700 transition-all cursor-pointer"
              >
                {actionLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
