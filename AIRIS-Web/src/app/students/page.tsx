"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useStudentStore } from "../../store/studentStore";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { TIP_MANILA_COORDINATORS } from "../../config/tipManilaAcademic";
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
} from "lucide-react";

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
  const urlCoordinator = searchParams.get("coordinator") || "all";
  const urlAccountStatus = searchParams.get("accountStatus") || "all";
  const urlResumeStatus = searchParams.get("resumeStatus") || "all";
  const urlScoreFilter = searchParams.get("score") || "all";

  const [currentPage, setCurrentPage] = useState(1);
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
    });
  }, [
    urlCoordinator,
    urlAccountStatus,
    currentAdmin?.role,
    currentAdmin?.uid,
    loadStudents,
  ]);

  // Update URL parameters
  const updateUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
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
  const filteredStudents = students.filter((s) => {
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
    if (urlAccountStatus === "active" && s.isDisabled) return false;
    if (urlAccountStatus === "disabled" && !s.isDisabled) return false;

    // Resume status
    if (urlResumeStatus === "uploaded" && !s.hasUploadedResume) return false;
    if (urlResumeStatus === "missing" && s.hasUploadedResume) return false;

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

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const hasActiveFilters =
    debouncedSearch ||
    urlCoordinator !== "all" ||
    urlAccountStatus !== "all" ||
    urlResumeStatus !== "all" ||
    urlScoreFilter !== "all";

  return (
    <div className="space-y-6 text-[#1E3E6B]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Student Directory</h1>
          <p className="text-sm font-semibold text-brand-slate mt-0.5">
            Authoritative student roster, evaluation inspection, and account lifecycle controls.
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
            placeholder="Search by student name, TIP institutional email, program track, or target position..."
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

          {/* Coordinator Filter (Renamed from College - OJT Coordinators assigned to departments/colleges) */}
          <Select
            value={urlCoordinator}
            onChange={(e) => updateUrlParam("coordinator", e.target.value)}
            aria-label="Filter by Coordinator"
          >
            <option value="all">Coordinator: All Coordinators</option>
            {TIP_MANILA_COORDINATORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            {/* Desktop Table View (>= 768px): Information-Dense Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1250px]">
                <thead>
                  <tr className="bg-[#DCE6EE]/30 border-b border-[#A5C2DA]/30 text-xs font-black uppercase tracking-wider text-brand-primary">
                    <th className="px-5 py-4 min-w-[200px] text-left whitespace-nowrap">Student Profile</th>
                    <th className="px-5 py-4 min-w-[200px] text-left whitespace-nowrap">TIP Institutional Email</th>
                    <th className="px-5 py-4 min-w-[160px] text-left whitespace-nowrap">Academic Track</th>
                    <th className="px-5 py-4 min-w-[150px] text-left whitespace-nowrap">Target Career</th>
                    <th className="px-5 py-4 min-w-[130px] text-left whitespace-nowrap">Resume Status</th>
                    <th className="px-5 py-4 min-w-[130px] text-left whitespace-nowrap">Resume Score</th>
                    <th className="px-5 py-4 min-w-[140px] text-left whitespace-nowrap">Interview Status</th>
                    <th className="px-5 py-4 min-w-[130px] text-left whitespace-nowrap">Interview Score</th>
                    <th className="px-5 py-4 min-w-[160px] text-left whitespace-nowrap">Employability Index</th>
                    <th className="px-5 py-4 min-w-[120px] text-left whitespace-nowrap">Account State</th>
                    <th className="px-5 py-4 min-w-[130px] text-left whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-bold">
                  {paginatedStudents.map((student) => {
                    const empScore = student.employabilityScore;
                    const rScore = student.resumeScore;
                    const iScore = student.interviewScore;

                    // Semantically truthful badge colors (missing !== 0)
                    const empBadgeColor =
                      empScore !== undefined
                        ? empScore >= 80
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : empScore >= 60
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-100 text-gray-500 border-gray-200";

                    const rBadgeColor =
                      rScore !== undefined
                        ? rScore >= 80
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : rScore >= 60
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-100 text-gray-500 border-gray-200";

                    const iBadgeColor =
                      iScore !== undefined
                        ? iScore >= 80
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : iScore >= 60
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-100 text-gray-500 border-gray-200";

                    return (
                      <tr key={student.uid} className="hover:bg-gray-50/60 transition-colors">
                        {/* 1. Student Profile */}
                        <td className="px-5 py-4 text-left">
                          <div className="flex items-center gap-3 text-left">
                            <div className="h-9 w-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-black text-xs shrink-0">
                              {student.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-extrabold text-[#1E3E6B] text-sm block whitespace-nowrap">
                                {student.fullName}
                              </span>
                              <span className="text-[11px] text-brand-slate font-medium whitespace-nowrap block">
                                Registered: {new Date(student.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. TIP Email */}
                        <td className="px-5 py-4 text-brand-slate font-medium whitespace-nowrap text-left">
                          {student.email}
                        </td>

                        {/* 3. Degree Program */}
                        <td className="px-5 py-4 text-left">
                          <span className="block font-bold text-[#1E3E6B]">{student.degreeProgram}</span>
                          <span className="text-[11px] text-brand-slate block font-normal">{student.college}</span>
                        </td>

                        {/* 4. Target Role */}
                        <td className="px-5 py-4 font-semibold text-brand-slate text-left">
                          {student.targetPosition || "Not set"}
                        </td>

                        {/* 5. Resume Status */}
                        <td className="px-5 py-4 text-left whitespace-nowrap">
                          {student.hasUploadedResume ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              Uploaded {student.resumesCount ? `(${student.resumesCount})` : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                              Missing Resume
                            </span>
                          )}
                        </td>

                        {/* 6. Resume Score */}
                        <td className="px-5 py-4 text-left whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${rBadgeColor}`}>
                            {rScore !== undefined ? `${rScore} / 100` : "Not Evaluated"}
                          </span>
                        </td>

                        {/* 7. Interview Status */}
                        <td className="px-5 py-4 text-left whitespace-nowrap">
                          {student.interviewStatus === "completed" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Completed {student.interviewsCount ? `(${student.interviewsCount})` : ""}
                            </span>
                          ) : student.interviewStatus === "in_progress" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              In Progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                              Not Started
                            </span>
                          )}
                        </td>

                        {/* 8. Interview Score */}
                        <td className="px-5 py-4 text-left whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black border ${iBadgeColor}`}>
                            {iScore !== undefined ? `${iScore} / 100` : "Not Evaluated"}
                          </span>
                        </td>

                        {/* 9. Employability Index */}
                        <td className="px-5 py-4 text-left whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${empBadgeColor}`}>
                            {empScore !== undefined ? `${empScore} / 100` : "Incomplete Data"}
                          </span>
                        </td>

                        {/* 10. Account State */}
                        <td className="px-5 py-4 text-left whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(student.uid, !!student.isDisabled)}
                            disabled={actionLoading}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border cursor-pointer transition-all ${
                              student.isDisabled
                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            <Power size={12} />
                            {student.isDisabled ? "Disabled" : "Active"}
                          </button>
                        </td>

                        {/* 11. Actions */}
                        <td className="px-5 py-4 text-left whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/students/${student.uid}`}
                              className="px-3 py-1.5 rounded-xl bg-brand-primary/10 text-brand-primary font-extrabold hover:bg-brand-primary/20 transition-all inline-flex items-center gap-1 text-xs"
                            >
                              <Eye size={14} /> Profile
                            </Link>
                            {currentAdmin?.role === "admin" && (
                              <button
                                onClick={() => openDeletePrompt(student.uid)}
                                disabled={actionLoading}
                                aria-label="Delete Student Account"
                                className="p-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card View (< 768px): Structured Information-Dense Cards */}
            <div className="block md:hidden divide-y divide-gray-100">
              {paginatedStudents.map((student) => {
                const empScore = student.employabilityScore;
                const rScore = student.resumeScore;
                const iScore = student.interviewScore;

                const empBadgeColor =
                  empScore !== undefined
                    ? empScore >= 80
                      ? "bg-teal-50 text-teal-700 border-teal-200"
                      : empScore >= 60
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-gray-100 text-gray-500 border-gray-200";

                return (
                  <div key={student.uid} className="p-4 space-y-3 bg-white">
                    {/* Top Row: Avatar, Name, Email, Employability */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-black text-sm shrink-0">
                          {student.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-[#1E3E6B] text-sm">{student.fullName}</h3>
                          <p className="text-xs font-semibold text-brand-slate">{student.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black border ${empBadgeColor} shrink-0`}>
                        {empScore !== undefined ? `${empScore} / 100` : "Incomplete"}
                      </span>
                    </div>

                    {/* Middle: Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-brand-slate bg-gray-50 p-3 rounded-xl border border-gray-150">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Program</span>
                        <span className="text-[#1E3E6B] font-extrabold">{student.degreeProgram}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase">Target Role</span>
                        <span className="text-brand-primary font-extrabold truncate block">
                          {student.targetPosition || "Not set"}
                        </span>
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] text-gray-400 block uppercase">Resume Score</span>
                        <span className="text-[#1E3E6B] font-black">
                          {rScore !== undefined ? `${rScore} / 100` : "Not Evaluated"}
                        </span>
                      </div>
                      <div className="pt-1">
                        <span className="text-[10px] text-gray-400 block uppercase">Interview Score</span>
                        <span className="text-[#1E3E6B] font-black">
                          {iScore !== undefined ? `${iScore} / 100` : "Not Evaluated"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
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

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/students/${student.uid}`}
                          className="px-3.5 py-1.5 rounded-xl bg-brand-primary text-white font-extrabold text-xs inline-flex items-center gap-1"
                        >
                          <Eye size={14} /> Profile
                        </Link>
                        {currentAdmin?.role === "admin" && (
                          <button
                            onClick={() => openDeletePrompt(student.uid)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timestamp footer */}
                    <div className="text-[10px] text-brand-slate font-medium pt-1 flex justify-between border-t border-gray-100">
                      <span>Registered: {new Date(student.createdAt).toLocaleDateString()}</span>
                      <span>Last Active: {new Date(student.lastActivityDate || student.updatedAt).toLocaleDateString()}</span>
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
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length}{" "}
              students
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
