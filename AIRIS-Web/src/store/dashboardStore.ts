import { create } from "zustand";
import { DashboardMetrics, SystemHealth, PerformanceInsight } from "../types/analytics.types";
import { fetchDashboardAnalytics } from "../services/firebase/analyticsService";

interface DashboardState {
  metrics: DashboardMetrics | null;
  health: SystemHealth | null;
  insights: PerformanceInsight | null;
  loading: boolean;
  error: string | null;
  loadDashboardData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: null,
  health: null,
  insights: null,
  loading: false,
  error: null,

  loadDashboardData: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchDashboardAnalytics();
      set({
        metrics: data.metrics,
        health: data.health,
        insights: data.insights,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to load dashboard statistics.", loading: false });
    }
  },
}));
