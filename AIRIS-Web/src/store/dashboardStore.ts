import { create } from "zustand";
import {
  DashboardMetrics,
  SystemHealth,
  PerformanceInsight,
  AnalyticsFilterParams,
} from "../types/analytics.types";
import { AdminRole } from "../types/auth.types";
import { fetchDashboardAnalytics } from "../services/firebase/analyticsService";

interface DashboardState {
  metrics: DashboardMetrics | null;
  health: SystemHealth | null;
  insights: PerformanceInsight | null;
  loading: boolean;
  error: string | null;
  activeFilters: AnalyticsFilterParams;
  setFilters: (filters: Partial<AnalyticsFilterParams>) => void;
  loadDashboardData: (
    filters?: AnalyticsFilterParams,
    userRole?: AdminRole,
    assignedProgram?: string
  ) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  metrics: null,
  health: null,
  insights: null,
  loading: false,
  error: null,
  activeFilters: {
    program: "all",
    coordinator: "all",
    period: "all",
    datasetScope: "all",
  },

  setFilters: (newFilters) => {
    set((state) => ({
      activeFilters: { ...state.activeFilters, ...newFilters },
    }));
  },

  loadDashboardData: async (filters, userRole, assignedProgram) => {
    const currentFilters = filters || get().activeFilters;
    set({ loading: true, error: null });
    try {
      const analyticsPayload = await fetchDashboardAnalytics(currentFilters, userRole, assignedProgram);
      set({
        metrics: analyticsPayload.metrics,
        health: analyticsPayload.health,
        insights: analyticsPayload.insights,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to load dashboard statistics.", loading: false });
    }
  },
}));
