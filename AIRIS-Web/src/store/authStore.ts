import { create } from "zustand";
import { AdminUser } from "../types/auth.types";
import { signInAdmin, signOutAdmin, subscribeToAuthState } from "../services/firebase/authService";

interface AuthState {
  currentAdmin: AdminUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeSession: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentAdmin: null,
  loading: false,
  error: null,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const admin = await signInAdmin(email, password);
      set({ currentAdmin: admin, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Invalid credentials.", loading: false });
      throw err;
    }
  },

  logout: async () => {
    const admin = get().currentAdmin;
    if (admin) {
      try {
        await signOutAdmin(admin);
      } catch {
        // Continue logout anyway
      }
    }
    set({ currentAdmin: null, error: null });
  },

  clearError: () => set({ error: null }),

  initializeSession: () => {
    set({ loading: true });
    const unsubscribe = subscribeToAuthState((admin) => {
      const prevAdmin = get().currentAdmin;
      if (prevAdmin && !admin) {
        set({
          currentAdmin: null,
          loading: false,
          initialized: true,
          error: "Your session has expired or your account was disabled.",
        });
      } else {
        set({ currentAdmin: admin, loading: false, initialized: true });
      }
    });
    return unsubscribe;
  },
}));
