import { create } from "zustand";
import { AdminUser } from "../types/auth.types";
import { signInAdmin, signOutAdmin, subscribeToAuthState } from "../services/firebase/authService";

interface AuthState {
  currentAdmin: AdminUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  isOtpVerified: boolean;
  login: (email: string, password: string) => Promise<AdminUser>;
  sendOtp: (idToken: string) => Promise<{ success: boolean; maskedEmail: string; cooldownSeconds: number }>;
  verifyOtp: (idToken: string, code: string) => Promise<void>;
  checkOtpStatus: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeSession: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentAdmin: null,
  loading: false,
  error: null,
  initialized: false,
  isOtpVerified: false,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const admin = await signInAdmin(email, password);
      set({ currentAdmin: admin, loading: false });
      return admin;
    } catch (err: any) {
      set({ error: err.message || "Invalid credentials.", loading: false });
      throw err;
    }
  },

  sendOtp: async (idToken: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      set({ loading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || "Failed to send verification code.", loading: false });
      throw err;
    }
  },

  verifyOtp: async (idToken: string, code: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ idToken, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code.");
      }

      set({ isOtpVerified: true, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Invalid verification code.", loading: false });
      throw err;
    }
  },

  checkOtpStatus: async () => {
    try {
      const res = await fetch("/api/auth/otp/status");
      const data = await res.json();
      const isVerified = Boolean(data.isVerified);
      set({ isOtpVerified: isVerified });
      return isVerified;
    } catch {
      set({ isOtpVerified: false });
      return false;
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

    try {
      await fetch("/api/auth/otp/logout", { method: "POST" });
    } catch {
      // Continue anyway
    }

    set({ currentAdmin: null, isOtpVerified: false, error: null });
  },

  clearError: () => set({ error: null }),

  initializeSession: () => {
    set({ loading: true });
    // Check initial OTP cookie status
    get().checkOtpStatus();

    const unsubscribe = subscribeToAuthState((admin) => {
      const prevAdmin = get().currentAdmin;
      if (prevAdmin && !admin) {
        set({
          currentAdmin: null,
          isOtpVerified: false,
          loading: false,
          initialized: true,
          error: "Your session has expired or your account was disabled.",
        });
      } else {
        set({ currentAdmin: admin, loading: false, initialized: true });
        if (admin) {
          get().checkOtpStatus();
        }
      }
    });
    return unsubscribe;
  },
}));
