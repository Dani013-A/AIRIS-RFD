"use client";

import React, { useEffect, useState } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { fetchAuditLogs } from "../../services/firebase/auditService";
import { AuditLogEntry } from "../../types/audit.types";
import { formatAdminRoleLabel } from "../../types/auth.types";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Select } from "../../components/ui/Select";
import {
  ShieldCheck,
  Search,
  Filter,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await fetchAuditLogs(150);
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
        return { label: "Account State Changed", color: "bg-teal-50 text-teal-700 border-teal-200" };
      case "UserDeleted":
      case "USERDELETED":
        return { label: "Student Account Deleted", color: "bg-red-50 text-red-700 border-red-200" };
      case "ReportsGenerated":
      case "REPORTSGENERATED":
        return { label: "Report Exported", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "AuthenticationEvents":
        return { label: "Authentication Event", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      default:
        const humanized = act
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        return { label: humanized || "Audit Record", color: "bg-gray-100 text-gray-700 border-gray-200" };
    }
  };

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (log.details || "").toLowerCase().includes(q) ||
      (log.actor || "").toLowerCase().includes(q) ||
      (log.action || "").toLowerCase().includes(q) ||
      (log.target || "").toLowerCase().includes(q) ||
      (log.role || "").toLowerCase().includes(q);

    if (!matchSearch) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#1E3E6B]">
              Security Audit Logs
            </h1>
            <p className="text-xs md:text-sm font-semibold text-brand-slate mt-0.5">
              Append-only audit registry of administrative access, student modifications, and report generation.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
            <ShieldCheck size={16} className="text-teal-600" /> Protected Audit Logging Active
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="figma-input-container flex-1 w-full">
              <Search size={18} className="text-brand-slate mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Search audit details, actor name, role, or target resource..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm font-semibold bg-transparent border-none outline-none text-[#1E3E6B]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold text-brand-slate hover:text-brand-primary cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Action Category Filter using centralized Select */}
            {uniqueActions.length > 0 && (
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-gray-500 sm:w-auto">
                <Filter size={14} />
                <Select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by action category"
                >
                  <option value="all">All Action Categories</option>
                  {uniqueActions.map((a) => (
                    <option key={a} value={a}>
                      {formatActionLabel(a).label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 gap-3">
              <LoadingSpinner size="md" />
              <p className="text-xs font-bold text-brand-slate">Querying Firestore security audit records...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-sm font-bold text-brand-slate space-y-2">
              <Shield size={36} className="text-gray-300" />
              <p>No security audit entries match your search query.</p>
              {(searchQuery || actionFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActionFilter("all");
                  }}
                  className="text-xs text-brand-primary underline hover:text-brand-orange cursor-pointer"
                >
                  Reset audit filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-black uppercase tracking-wider text-[#1E3E6B]">
                      <th className="px-5 py-3.5 w-[190px] whitespace-nowrap">Timestamp</th>
                      <th className="px-5 py-3.5 w-[170px] whitespace-nowrap">Action</th>
                      <th className="px-5 py-3.5 w-[190px] whitespace-nowrap">Actor & Role</th>
                      <th className="px-5 py-3.5 w-[150px] whitespace-nowrap">Target</th>
                      <th className="px-5 py-3.5 w-[100px] whitespace-nowrap">Result</th>
                      <th className="px-5 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium">
                    {paginatedLogs.map((log) => {
                      const actionInfo = formatActionLabel(log.action);
                      const isSuccess = (log.result || "").toUpperCase() === "SUCCESS";
                      const isExpanded = expandedLogId === log.id;

                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            onClick={() => toggleExpand(log.id)}
                            className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                          >
                            {/* Timestamp */}
                            <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                              <span className="flex items-center gap-1.5 font-medium">
                                <Clock size={13} className="text-gray-400" />
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </td>

                            {/* Action Badge */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${actionInfo.color}`}
                              >
                                {actionInfo.label}
                              </span>
                            </td>

                            {/* Actor & Role */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold text-[#1E3E6B]">
                                  {log.actor || "System"}
                                </span>
                                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                  {formatAdminRoleLabel(log.role as any)}
                                </span>
                              </div>
                            </td>

                            {/* Target */}
                            <td className="px-5 py-3.5 text-gray-600 font-semibold whitespace-nowrap">
                              <code className="bg-gray-100 px-2 py-0.5 rounded text-[11px] text-[#1E3E6B]">
                                {log.target || "System"}
                              </code>
                            </td>

                            {/* Result */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                                  isSuccess
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-red-50 text-red-800 border-red-200"
                                }`}
                              >
                                {log.result || "SUCCESS"}
                              </span>
                            </td>

                            {/* Details with expand toggle */}
                            <td className="px-5 py-3.5 text-gray-600">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate max-w-[320px] block">{log.details}</span>
                                <button
                                  type="button"
                                  aria-label="Toggle details expansion"
                                  className="text-gray-400 hover:text-[#1E3E6B] p-1 rounded"
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded row content */}
                          {isExpanded && (
                            <tr className="bg-gray-50/70 border-b border-gray-200">
                              <td colSpan={6} className="px-5 py-3 text-xs">
                                <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 font-medium border-b border-gray-100 pb-2">
                                    <div>
                                      <span className="font-bold text-gray-700">Record ID: </span>
                                      <code className="font-mono text-[10px]">{log.id}</code>
                                    </div>
                                    <div>
                                      <span className="font-bold text-gray-700">Actor ID: </span>
                                      <code className="font-mono text-[10px]">{log.actorId || "N/A"}</code>
                                    </div>
                                    <div>
                                      <span className="font-bold text-gray-700">Exact Time: </span>
                                      <span>{new Date(log.timestamp).toISOString()}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-bold text-gray-700 block mb-1">Full Event Details:</span>
                                    <p className="text-gray-700 leading-relaxed font-mono text-[11px] bg-gray-50 p-2 rounded border border-gray-150">
                                      {log.details}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (< 768px) */}
              <div className="block md:hidden divide-y divide-gray-100">
                {paginatedLogs.map((log) => {
                  const actionInfo = formatActionLabel(log.action);
                  const isSuccess = (log.result || "").toUpperCase() === "SUCCESS";
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <div
                      key={log.id}
                      onClick={() => toggleExpand(log.id)}
                      className="p-4 space-y-2.5 bg-white cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${actionInfo.color}`}
                        >
                          {actionInfo.label}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            isSuccess
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-red-50 text-red-800 border-red-200"
                          }`}
                        >
                          {log.result || "SUCCESS"}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-gray-700 leading-relaxed">
                        {log.details}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase">Actor</span>
                          <span className="text-[#1E3E6B] font-extrabold">{log.actor}</span>
                          <span className="text-[10px] text-gray-500 block">
                            {formatAdminRoleLabel(log.role as any)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase">Target</span>
                          <span className="text-gray-700 font-mono truncate block">
                            {log.target || "System"}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-400 font-medium pt-1 flex items-center justify-between border-t border-gray-100">
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                        <span className="text-[#1E3E6B] font-bold">
                          {isExpanded ? "Collapse" : "Expand"}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-gray-150 text-[11px] space-y-1 font-mono text-gray-600">
                          <div>
                            <span className="font-bold">ID:</span> {log.id}
                          </div>
                          <div>
                            <span className="font-bold">Actor ID:</span> {log.actorId || "N/A"}
                          </div>
                          <div>
                            <span className="font-bold">ISO Time:</span> {new Date(log.timestamp).toISOString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {!loading && filteredLogs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-gray-200 text-xs font-bold text-gray-600 bg-gray-50/50 gap-3">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} audit entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-gray-50"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="px-3 py-1.5 font-bold text-[#1E3E6B]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white disabled:opacity-40 flex items-center gap-1 cursor-pointer hover:bg-gray-50"
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
