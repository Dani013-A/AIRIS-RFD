"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useStudentStore } from "../../store/studentStore";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";
import Link from "next/link";
import { Search, Eye, Power, Trash2 } from "lucide-react";

export default function StudentsPage() {
  const { currentAdmin } = useAuthStore();
  const {
    students,
    loading,
    actionLoading,
    loadStudents,
    toggleAccountStatus,
    deleteStudent,
  } = useStudentStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleToggleStatus = async (studentId: string, currentDisabled: boolean) => {
    if (!currentAdmin) return;
    try {
      await toggleAccountStatus(studentId, !currentDisabled, currentAdmin.fullName);
    } catch {
      alert("Failed to modify user status.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedStudentId || !currentAdmin) return;
    try {
      await deleteStudent(selectedStudentId, currentAdmin.fullName);
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

  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.degreeProgram?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Student Directory</h1>
          <p className="text-xs font-bold text-brand-slate mt-0.5">Manage registered accounts and evaluate their professional preparedness.</p>
        </div>

        {/* Toolbar & Search */}
        <div className="figma-input-container w-full max-w-xl">
          <Search size={18} className="text-brand-slate mr-3" />
          <input
            type="text"
            placeholder="Search by student name, email, or program track..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm font-semibold bg-transparent border-none outline-none text-[#1E3E6B]"
          />
        </div>

        {/* List table */}
        <div className="figma-card overflow-hidden bg-white">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-xs font-bold text-brand-slate">
              No registered students found matching search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#DCE6EE]/30 border-b border-[#A5C2DA]/30">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-brand-primary">Student Name</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-brand-primary">Email Address</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-brand-primary">Degree Track</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-center text-brand-primary">Employabilit Score</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-center text-brand-primary">Resume</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-center text-brand-primary">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-right text-brand-primary">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map((student) => (
                    <tr key={student.uid} className="hover:bg-[#E7EFF5]/20 transition-all">
                      <td className="px-6 py-4 text-sm font-bold text-[#1E3E6B]">{student.fullName}</td>
                      <td className="px-6 py-4 text-xs font-bold text-brand-slate">{student.email}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-brand-slate">{student.degreeProgram}</td>
                      <td className="px-6 py-4 text-center">
                        {student.employabilityScore !== undefined && student.employabilityScore > 0 ? (
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-xs font-black">
                            {student.employabilityScore}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide border ${
                            student.resumeStatus === "success"
                              ? "bg-teal-50 border-teal-200 text-teal-700"
                              : "bg-red-50 border-red-200 text-red-700"
                          }`}
                        >
                          {student.resumeStatus === "success" ? "Uploaded" : "Missing"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide border ${
                            student.isDisabled
                              ? "bg-red-50 border-red-200 text-red-700"
                              : "bg-teal-50 border-teal-200 text-teal-700"
                          }`}
                        >
                          {student.isDisabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/students/${student.uid}`}
                            className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-[#A5C2DA]/30 hover:text-brand-primary text-brand-slate transition-all"
                          >
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(student.uid, student.isDisabled ?? false)}
                            disabled={actionLoading}
                            className={`p-2 border rounded-xl transition-all ${
                              student.isDisabled
                                ? "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                                : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() => openDeletePrompt(student.uid)}
                            disabled={actionLoading}
                            className="p-2 bg-red-50/50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deletion Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Permanently Delete Student Profile"
        >
          <div className="space-y-4 text-[#1E3E6B]">
            <p className="text-xs font-semibold text-brand-slate leading-relaxed">
              Are you sure you want to delete this student account? This action is permanent and will clear their entire resume parsing log, ATS score analysis, and dashboard records.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-brand-slate border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 flex items-center gap-2"
              >
                {actionLoading ? <LoadingSpinner size="sm" color="white" /> : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
