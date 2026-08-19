"use client";

import React, { useEffect } from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useAuditStore } from "../../store/auditStore";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

export default function AuditPage() {
  const { logs, loading, error, loadAuditLogs } = useAuditStore();

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Security Audit Logs</h1>
          <p className="text-xs font-bold text-brand-slate mt-0.5">Review system activities, login events, and student profile changes.</p>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Logs List Container */}
        <div className="figma-card bg-white p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-xs font-bold text-brand-slate">
              No audit activities recorded in this session.
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="absolute left-1.5 top-1.5 h-3.5 w-3.5 rounded-full bg-brand-slate border-2 border-white shadow-xs" />

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-brand-primary/5 text-brand-primary uppercase tracking-wide">
                        {log.action}
                      </span>
                      <span className="text-xs font-semibold text-[#1E3E6B]">
                        by <strong className="text-brand-primary font-bold">{log.performedBy}</strong>
                      </span>
                    </div>
                    <p className="text-xs font-medium text-brand-slate leading-relaxed">
                      {log.details}
                    </p>
                  </div>

                  <span className="text-[10px] font-bold text-brand-slate/60 shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
