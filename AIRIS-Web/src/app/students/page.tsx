"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useStudentStore } from "../../store/studentStore";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { TIP_MANILA_COORDINATORS, getCoordinatorById, getProgramsForCoordinator, matchesProgramChoice } from "../../config/tipManilaAcademic";
import { sortStudentRoster } from "./sortStudentRoster";
import { studentProfileHref } from "./profileNavigation.mjs";
import Link from "next/link";
import {
  Search,
  Eye,
  Power,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
} from "lucide-react";

function scoreToneClasses(score: number | undefined): string {
  if (score === undefined) return "bg-gray-100 text-gray-500 border-gray-200";
  if (score >= 80) return "bg-teal-50 text-teal-700 border-teal-200";
  if (score >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function StudentsDirectoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

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

  // Search input with internal debounce
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");

  // Read filters from URL
  const urlCoordinator = getCoordinatorById(searchParams.get("coordinator") || "all")?.id || "all";
  const urlAccountStatus = searchParams.get("accountStatus") || "all";
  const urlResumeStatus = searchParams.get("resumeStatus") || "all";
  const urlScoreFilter = searchParams.get("score") || "all";
  const scopedPrograms = getProgramsForCoordinator(urlCoordinator);
  const requestedProgram = searchParams.get("program") || "all";
  const urlProgram = requestedProgram === "all" || scopedPrograms.some((program) => program.name === requestedProgram) ||
    (urlCoordinator === "all" && requestedProgram === "Unspecified Program") ? requestedProgram : "all";
  const urlInterviewStatus = searchParams.get("interviewStatus") || "all";
  const urlSort = searchParams.get("sort") || "name-asc";

  const [currentPage, setCurrentPage] = useState(() => {
    const page = Number(searchParams.get("page"));
    return Number.isSafeInteger(page) && page > 0 ? page : 1;
  });
  const pageSize = 10;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load students on mount or filter change
  useEffect(() => {
    loadStudents({
      coordinator: urlCoordinator,
      status: urlAccountStatus !== "all" ? urlAccountStatus : undefined,
      userRole: currentAdmin?.role,
      assignedProgram: currentAdmin?.assignedProgram,
    });
  }, [
    urlCoordinator,
    urlAccountStatus,
    currentAdmin?.role,
    currentAdmin?.assignedProgram,
    currentAdmin?.uid,
    loadStudents,
  ]);

  // Update URL parameters
  const updateUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (key === "coordinator" && value !== "all" && !getProgramsForCoordinator(value).some((program) => program.name === params.get("program"))) {
      params.delete("program");
    }
    if (value === "all" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setCurrentPage(1);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCurrentPage(1);
    startTransition(() => {
      router.push(pathname);
    });
  };

  const handleToggleStatus = async (studentId: string, currentDisabled: boolean) => {
    if (!currentAdmin) return;
    try {
      await toggleAccountStatus(studentId, !currentDisabled, {
        name: currentAdmin.fullName || "Admin",
        uid: currentAdmin.uid,
        role: currentAdmin.role,
      });
    } catch {
      alert("Failed to modify user status.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudentId || !currentAdmin) return;
    try {
      await deleteStudent(selectedStudentId, {
        name: currentAdmin.fullName || "Admin",
        uid: currentAdmin.uid,
        role: currentAdmin.role,
      });
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

  // Client-side filtering across debounced search and granular score/status filters
  const matchingStudents = students.filter((s) => {
    // Search query match
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      const matchSearch =
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.degreeProgram || "").toLowerCase().includes(q) ||
        (s.targetPosition || "").toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    // Account status
    if (urlProgram !== "all" && !matchesProgramChoice(s.degreeProgram, urlProgram)) return false;
    if (urlAccountStatus === "active" && s.isDisabled) return false;
    if (urlAccountStatus === "disabled" && !s.isDisabled) return false;

    // Resume status
    if (urlResumeStatus === "uploaded" && !s.hasUploadedResume) return false;
    if (urlResumeStatus === "missing" && s.hasUploadedResume) return false;

    if (urlInterviewStatus === "done" && s.interviewStatus !== "completed") return false;
    if (urlInterviewStatus === "in_progress" && s.interviewStatus !== "in_progress") return false;
    if (urlInterviewStatus === "not-done" && s.interviewStatus === "completed") return false;

    // Employability score filter (strictly respectful of undefined vs zero)
    const emp = s.employabilityScore;
    if (urlScoreFilter === "high") {
      if (emp === undefined || emp < 80) return false;
    } else if (urlScoreFilter === "moderate") {
      if (emp === undefined || emp < 60 || emp >= 80) return false;
    } else if (urlScoreFilter === "low") {
      if (emp === undefined || emp >= 60) return false;
    } else if (urlScoreFilter === "incomplete") {
      if (emp !== undefined) return false;
    }

    return true;
  });

  const programs = [...scopedPrograms].sort((a, b) => a.name.localeCompare(b.name));
  const filteredStudents = sortStudentRoster(matchingStudents, urlSort);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice(
    (visiblePage - 1) * pageSize,
    visiblePage * pageSize
  );

  const hasActiveFilters =
    debouncedSearch ||
    urlCoordinator !== "all" ||
    urlAccountStatus !== "all" ||
    urlResumeStatus !== "all" ||
    urlInterviewStatus !== "all" ||
    urlScoreFilter !== "all" ||
    urlProgram !== "all" ||
    urlSort !== "name-asc";

  return (
    <div className="space-y-6 text-[#1E3E6B]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Student Directory</h1>
          <p className="text-sm font-semibold text-brand-slate mt-0.5">
            Find students, review their progress, and open their profiles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-[#1E3E6B] border border-gray-250">
            Registered Students: {students.length}
          </span>
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
            Active Students: {students.filter((s) => !s.isDisabled).length}
          </span>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
        {/* Search bar */}
        <div className="figma-input-container w-full">
          <Search size={18} className="text-brand-slate mr-3 shrink-0" />
          <input
            type="text"
            aria-label="Search students"
            placeholder="Search by student name, T.I.P. institutional email, program track, or target position..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full text-sm font-semibold bg-transparent border-none outline-none text-[#1E3E6B]"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="text-xs font-bold text-brand-slate hover:text-brand-primary cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Dropdowns Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs font-bold text-brand-slate">
          <div className="flex items-center gap-1 text-gray-500 font-bold text-xs h-9 shrink-0">
            <Filter size={14} /> Filter Roster:
          </div>

          <details className="group w-full min-w-0 rounded-lg border border-gray-200 px-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-[#1E3E6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3E6B] [&::-webkit-details-marker]:hidden">
              <span>Coordinator and program {urlCoordinator !== "all" || urlProgram !== "all" ? "(filtered)" : ""}</span>
              <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid grid-cols-1 gap-3 pb-3 pt-1 lg:grid-cols-2">
              <Select value={urlCoordinator} onChange={(e) => updateUrlParam("coordinator", e.target.value)} aria-label="Filter by Coordinator" containerClassName="!w-full">
                <option value="all">All Coordinators</option>
                {TIP_MANILA_COORDINATORS.map((c) => <option key={c.id} value={c.id}>{c.shortName}</option>)}
              </Select>
              <Select value={urlProgram} onChange={(e) => updateUrlParam("program", e.target.value)} aria-label="Filter by program" containerClassName="!w-full">
                <option value="all">All Programs</option>
                {programs.map((program) => <option key={program.name} value={program.name}>{program.name}</option>)}
                {urlCoordinator === "all" && students.some((student) => student.degreeProgram === "Unspecified Program") && <option value="Unspecified Program">Unspecified Program</option>}
              </Select>
            </div>
          </details>

          {/* Account Status Filter */}
          <Select
            value={urlAccountStatus}
            onChange={(e) => updateUrlParam("accountStatus", e.target.value)}
            aria-label="Filter by account status"
          >
            <option value="all">Account: All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="disabled">Disabled Accounts</option>
          </Select>

          <Select value={urlSort} onChange={(e) => updateUrlParam("sort", e.target.value)} aria-label="Sort students">
            <option value="name-asc">Name: A–Z</option>
            <option value="name-desc">Name: Z–A</option>
            <option value="college-asc">College: A–Z</option>
            <option value="program-asc">Program: A–Z</option>
            <option value="target-asc">Target: A–Z</option>
            <option value="resume-desc">Resume score: High–Low</option>
            <option value="interview-desc">Interview score: High–Low</option>
            <option value="readiness-desc">Preparedness: High–Low</option>
          </Select>

          {/* Resume Upload Status Filter */}
          <Select
            value={urlResumeStatus}
            onChange={(e) => updateUrlParam("resumeStatus", e.target.value)}
            aria-label="Filter by resume status"
          >
            <option value="all">Resume: All</option>
            <option value="uploaded">Uploaded Resume</option>
            <option value="missing">Missing Resume</option>
          </Select>

          <Select value={urlInterviewStatus} onChange={(e) => updateUrlParam("interviewStatus", e.target.value)} aria-label="Filter by interview completion">
            <option value="all">Interview: All</option>
            <option value="done">Interview Done</option>
            <option value="in_progress">Interview In Progress</option>
            <option value="not-done">Interview Not Done</option>
          </Select>

          {/* Employability Score Filter */}
          <Select
            value={urlScoreFilter}
            onChange={(e) => updateUrlParam("score", e.target.value)}
            aria-label="Filter by employability score"
          >
            <option value="all">Employability: All</option>
            <option value="high">High Preparedness (80–100)</option>
            <option value="moderate">Moderate Preparedness (60–79)</option>
            <option value="low">Needs Remediation (&lt;60)</option>
            <option value="incomplete">Incomplete Data (Pending)</option>
          </Select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-brand-primary hover:text-brand-orange ml-auto cursor-pointer flex items-center gap-1 h-9 font-bold"
            >
              <RotateCcw size={12} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Directory Roster Container */}
      <div className="bg-[#F4F7FA] rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 gap-3">
            <LoadingSpinner size="md" />
            <p className="text-xs font-bold text-brand-slate">Querying Firestore student records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-red-50/50 border border-red-200 rounded-xl m-4 space-y-3">
            <AlertTriangle className="mx-auto text-red-600" size={32} />
            <h3 className="text-sm font-bold text-red-800">Failed to load student records</h3>
            <p className="text-xs text-red-600 max-w-md mx-auto">{error}</p>
            <button
              onClick={() =>
                loadStudents({
                  coordinator: urlCoordinator,
                  status: urlAccountStatus !== "all" ? urlAccountStatus : undefined,
                  userRole: currentAdmin?.role,
                  assignedProgram: currentAdmin?.assignedProgram,
                })
              }
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition cursor-pointer"
            >
              <RotateCcw size={14} /> Retry Query
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm font-bold text-brand-slate space-y-2">
            <User size={36} className="text-gray-300" />
            <p>No student accounts match the active search or scope filter.</p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-brand-primary underline hover:text-brand-orange cursor-pointer"
              >
                Clear all active filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Responsive Student Card Directory: one card per student, all viewports */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 md:p-5">
              {paginatedStudents.map((student) => {
                const empScore = student.employabilityScore;
                const rScore = student.resumeScore;
                const iScore = student.interviewScore;

                return (
                  <article
                    key={student.uid}
                    aria-label={`Student card for ${student.fullName}`}
                    className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 space-y-4 min-w-0"
                  >
                    {/* 1. Student identity + employability */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          aria-hidden="true"
                          className="h-11 w-11 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-black text-base shrink-0"
                        >
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="font-extrabold text-[#1E3E6B] text-base leading-snug break-words">
                              {student.fullName}
                            </h3>
                            {(student.isDefenseDemo || student.isSyntheticUat) && <span className="text-xs font-semibold text-brand-slate">Test / demo account</span>}
                          </div>
                          <p className="text-xs text-brand-slate font-medium break-all">{student.email}</p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 whitespace-nowrap items-center px-3 py-1 rounded-full text-xs font-black border ${scoreToneClasses(empScore)}`}
                      >
                        {empScore !== undefined ? `Employability: ${empScore} / 100` : "Employability: Incomplete"}
                      </span>
                    </div>

                    {/* 2+3. Academic + career information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-[#F4F7FA] border border-gray-200/70 p-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                          Academic Track
                        </span>
                        <span className="block font-bold text-[#1E3E6B] text-sm break-words">
                          {student.degreeProgram}
                        </span>
                        <span className="block text-[11px] text-brand-slate font-medium break-words">
                          {student.college}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                          Target Career
                        </span>
                        <span className="block font-bold text-brand-primary text-sm break-words">
                          {student.targetPosition || "Not set"}
                        </span>
                      </div>
                    </div>

                    {/* 4. Evaluation status */}
                    <div className="flex flex-wrap items-center gap-2">
                      {student.hasUploadedResume ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          Resume Uploaded{student.resumesCount ? ` (${student.resumesCount})` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                          Missing Resume
                        </span>
                      )}
                      {student.interviewStatus === "completed" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Interview Completed{student.interviewsCount ? ` (${student.interviewsCount})` : ""}
                        </span>
                      ) : student.interviewStatus === "in_progress" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Interview In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                          Interview Not Started
                        </span>
                      )}
                    </div>

                    {/* 5. Scores */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-[#F4F7FA] border border-gray-200/70 px-2 py-2 text-center min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Resume Score
                        </span>
                        <span className={`block text-sm font-black ${rScore !== undefined ? "text-[#1E3E6B]" : "text-gray-400"}`}>
                          {rScore !== undefined ? `${rScore} / 100` : "Not Evaluated"}
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#F4F7FA] border border-gray-200/70 px-2 py-2 text-center min-w-0">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Interview Score
                        </span>
                        <span className={`block text-sm font-black ${iScore !== undefined ? "text-[#1E3E6B]" : "text-gray-400"}`}>
                          {iScore !== undefined ? `${iScore} / 100` : "Not Evaluated"}
                        </span>
                      </div>
                    </div>

                    {/* 6. Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                      <Link
                        href={studentProfileHref(student.uid, searchParams.toString(), searchInput, visiblePage)}
                        aria-label={`View profile of ${student.fullName}`}
                        className="inline-flex h-11 items-center gap-1.5 px-4 rounded-lg bg-[#1E3E6B] text-white text-xs font-bold hover:bg-[#274f89] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3E6B] transition-colors"
                      >
                        <Eye size={14} /> View Profile
                      </Link>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(student.uid, !!student.isDisabled)}
                          disabled={actionLoading}
                          aria-label={`${student.isDisabled ? "Enable" : "Disable"} account of ${student.fullName}`}
                          title={student.isDisabled ? "Enable account" : "Disable account"}
                          className={`inline-flex h-11 items-center gap-1.5 px-3 rounded-lg text-xs font-extrabold border cursor-pointer transition-colors disabled:opacity-50 ${
                            student.isDisabled
                              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          }`}
                        >
                          <Power size={12} />
                          {student.isDisabled ? "Disabled" : "Active"}
                        </button>
                        {currentAdmin?.role === "admin" && (
                          <button
                            onClick={() => openDeletePrompt(student.uid)}
                            disabled={actionLoading}
                            title="Delete student account"
                            aria-label={`Delete account of ${student.fullName}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timestamp footer */}
                    <div className="text-[10px] text-brand-slate font-medium flex flex-wrap justify-between gap-1">
                      <span>Registered: {new Date(student.createdAt).toLocaleDateString()}</span>
                      <span>Last Active: {new Date(student.lastActivityDate || student.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </article>
                );
              })}
            </div>          </>
        )}

        {/* Pagination Controls */}
        {!loading && filteredStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 text-xs font-bold text-brand-slate bg-gray-50/50 gap-3">
            <div>
              Showing {(visiblePage - 1) * pageSize + 1} to{" "}
              {Math.min(visiblePage * pageSize, filteredStudents.length)} of {filteredStudents.length}{" "}
              students
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
                disabled={visiblePage === 1}
                className="px-3 py-1.5 rounded-xl border border-gray-250 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="px-3 py-1.5 font-extrabold text-[#1E3E6B]">
                Page {visiblePage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
                disabled={visiblePage === totalPages}
                className="px-3 py-1.5 rounded-xl border border-gray-250 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Admin only) */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Student Account Deletion"
      >
        <div className="space-y-4 text-xs font-semibold text-brand-slate">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
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
  );
}

export default function StudentsPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex h-64 flex-col items-center justify-center p-6 gap-3">
            <LoadingSpinner size="md" />
            <p className="text-xs font-bold text-brand-slate">Loading student roster...</p>
          </div>
        }
      >
        <StudentsDirectoryContent />
      </Suspense>
    </DashboardLayout>
  );
}
