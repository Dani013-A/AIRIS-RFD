"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { fetchAuditLogs } from "../../services/firebase/auditService";
import { AuditLogEntry } from "../../types/audit.types";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ShieldCheck, Search, Filter, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await fetchAuditLogs(100);
        setLogs(data);
      } catch (e) {
        console.error("Failed to load audit logs:", e);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const formatActionLabel = (action: string) => {
    const act = (action || "").trim();
    switch (act) {
      case "AdminLogin":
      case "ADMINLOGIN":
        return { label: "Admin Sign In", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "AdminLogout":
      case "ADMINLOGOUT":
        return { label: "Admin Sign Out", color: "bg-gray-100 text-gray-700 border-gray-200" };
      case "StudentUpdated":
      case "STUDENTUPDATED":
        return { label: "Account Status Changed", color: "bg-teal-50 text-teal-700 border-teal-200" };
      case "UserDeleted":
      case "USERDELETED":
        return { label: "Student Account Deleted", color: "bg-red-50 text-red-700 border-red-200" };
      case "ReportsGenerated":
      case "REPORTSGENERATED":
        return { label: "Report Downloaded", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "AuthenticationEvents":
        return { label: "Authentication Event", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      default:
        // Convert camelCase or UPPERCASE to Human Title Case
        const humanized = act
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        return { label: humanized || "System Audit Event", color: "bg-gray-100 text-gray-700 border-gray-200" };
    }
  };

  const humanizeDetails = (details: string, performedBy: string) => {
    let text = details || "";

    // Fix redundant "Administrator System Administrator logged out."
    text = text.replace(/Administrator\s+Administrator/gi, "Administrator");
    text = text.replace(/Administrator\s+System Administrator logged out\.?/gi, "System Administrator signed out.");
    text = text.replace(/Administrator\s+System Administrator logged in\.?/gi, "System Administrator signed in successfully.");

    // Clean up raw UID patterns if present
    text = text.replace(/user account:\s*([a-zA-Z0-9_-]{12,})/gi, "a student account");
    text = text.replace(/student profile:\s*([a-zA-Z0-9_-]{12,})/gi, "a student profile");

    return text;
  };

  const filteredLogs = logs.filter((log) => {
    const matchSearch =
      (log.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.performedBy || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.action || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Security Audit Logs</h1>
            <p className="text-sm font-semibold text-brand-slate mt-0.5">
              Trace administrative sign-ins, user account state changes, report downloads, and security registry events.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-slate bg-white px-3 py-1.5 rounded-xl border border-gray-200">
            <ShieldCheck size={16} className="text-emerald-600" /> Audit Logging Active
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="figma-card p-4 bg-white space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="figma-input-container flex-1 w-full">
              <Search size={18} className="text-brand-slate mr-3" />
              <input
                type="text"
                placeholder="Search audit details, actor name, or event category..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm font-semibold bg-transparent border-none outline-none text-[#1E3E6B]"
              />
            </div>

            {/* Action Category Filter */}
            {uniqueActions.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-brand-slate" />
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by action category"
                  className="px-3 py-2 rounded-xl border border-gray-250 bg-gray-50 text-xs text-[#1E3E6B] font-bold outline-none focus:border-brand-primary"
                >
                  <option value="all">All Action Categories</option>
                  {uniqueActions.map((a) => (
                    <option key={a} value={a}>
                      {formatActionLabel(a).label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Logs Table */}
        <div className="figma-card overflow-hidden bg-white">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 gap-3">
              <LoadingSpinner size="md" />
              <p className="text-xs font-bold text-brand-slate">Fetching Firestore security audit records...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm font-bold text-brand-slate">
              No security audit logs found matching search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-[#DCE6EE]/30 border-b border-[#A5C2DA]/30 text-xs font-black uppercase tracking-wider text-brand-primary">
                    <th className="px-5 py-4 w-[210px] whitespace-nowrap">Timestamp</th>
                    <th className="px-5 py-4 w-[220px] whitespace-nowrap">Event Category</th>
                    <th className="px-5 py-4 w-[200px] whitespace-nowrap">Performed By</th>
                    <th className="px-5 py-4">Audit Event Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-bold">
                  {paginatedLogs.map((log) => {
                    const actionInfo = formatActionLabel(log.action);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Timestamp */}
                        <td className="px-5 py-4 text-brand-slate font-medium whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-brand-slate" />
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </td>

                        {/* Action Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border whitespace-nowrap ${actionInfo.color}`}>
                            {actionInfo.label}
                          </span>
                        </td>

                        {/* Performed By */}
                        <td className="px-5 py-4 font-extrabold text-[#1E3E6B] whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <User size={13} className="text-brand-primary" />
                            {log.performedBy || "System"}
                          </span>
                        </td>

                        {/* Details */}
                        <td className="px-5 py-4 text-brand-slate font-normal leading-relaxed">
                          {humanizeDetails(log.details, log.performedBy)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredLogs.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs font-bold text-brand-slate bg-gray-50/50">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} audit entries
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
      </div>
    </DashboardLayout>
  );
}
