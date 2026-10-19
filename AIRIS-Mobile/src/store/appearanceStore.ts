import { create } from "zustand";
import { normalizeTextSize, type TextSize } from "../components/ui/typographyScale";

export type { TextSize } from "../components/ui/typographyScale";

interface AppearanceState {
  activeUserId: string | null;
  textSize: TextSize;
  setActiveUser: (uid: string | null) => void;
  setTextSize: (textSize: TextSize) => void;
  resetForNewSession: () => void;
}

/**
 * Session-only text-size preference.
 *
 * - Default is Medium.
 * - Changing the size updates the whole signed-in session.
 * - Starting a new signed-in session (login / account switch / auth restore
 *   with no user) always starts at Medium.
 * - Nothing is persisted across logout/login by design.
 */
export const useAppearanceStore = create<AppearanceState>()((set) => ({
  activeUserId: null,
  textSize: "medium",
  setActiveUser: (uid) =>
    set(() => ({
      activeUserId: uid,
      textSize: "medium",
    })),
  setTextSize: (textSize) =>
    set((state) => {
      if (!state.activeUserId) return { textSize: "medium" } as Partial<AppearanceState>;
      return { textSize: normalizeTextSize(textSize) };
    }),
  resetForNewSession: () => set({ activeUserId: null, textSize: "medium" }),
}));
