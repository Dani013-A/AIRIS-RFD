import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeTextSize, type TextSize } from "../components/ui/typographyScale";

export type { TextSize } from "../components/ui/typographyScale";

interface AppearanceState {
  activeUserId: string | null;
  preferencesByUser: Record<string, TextSize>;
  textSize: TextSize;
  setActiveUser: (uid: string | null) => void;
  setTextSize: (textSize: TextSize) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      activeUserId: null,
      preferencesByUser: {},
      textSize: "medium",
      setActiveUser: (uid) => set((state) => ({
        activeUserId: uid,
        textSize: uid ? state.preferencesByUser[uid] || "medium" : "medium",
      })),
      setTextSize: (textSize) => set((state) => {
        if (!state.activeUserId) return { textSize: "medium" };
        const normalized = normalizeTextSize(textSize);
        return {
          textSize: normalized,
          preferencesByUser: { ...state.preferencesByUser, [state.activeUserId]: normalized },
        };
      }),
    }),
    {
      name: "airis-appearance",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      skipHydration: true,
      partialize: (state) => ({ preferencesByUser: state.preferencesByUser }),
      migrate: () => ({ preferencesByUser: {} }),
      merge: (persisted, current) => {
        const saved = (persisted as Partial<AppearanceState> | null)?.preferencesByUser;
        const preferencesByUser: Record<string, TextSize> = {};
        if (saved && typeof saved === "object") {
          for (const [uid, size] of Object.entries(saved)) {
            if (uid && (size === "small" || size === "medium" || size === "large")) {
              preferencesByUser[uid] = size;
            }
          }
        }
        return {
          ...current,
          preferencesByUser,
          textSize: current.activeUserId ? preferencesByUser[current.activeUserId] || "medium" : "medium",
        };
      },
    }
  )
);
