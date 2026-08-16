import { create } from "zustand";
import { AuditLogEntry } from "../types/audit.types";
import { fetchAuditLogs } from "../services/firebase/auditService";

interface AuditState {
  logs: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  loadAuditLogs: () => Promise<void>;
}

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  loading: false,
  error: null,

  loadAuditLogs: async () => {
    set({ loading: true, error: null });
    try {
      const entries = await fetchAuditLogs(50);
      set({ logs: entries, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load security logs.", loading: false });
    }
  },
}));
