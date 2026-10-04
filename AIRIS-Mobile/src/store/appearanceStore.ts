import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeTextSize, type TextSize } from "../components/ui/typographyScale";

export type { TextSize } from "../components/ui/typographyScale";

interface AppearanceState {
  textSize: TextSize;
  setTextSize: (textSize: TextSize) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      textSize: "medium",
      setTextSize: (textSize) => set({ textSize }),
    }),
    {
      name: "airis-appearance",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ textSize: state.textSize }),
      merge: (persisted, current) => ({
        ...current,
        textSize: normalizeTextSize((persisted as Partial<AppearanceState> | null)?.textSize),
      }),
    }
  )
);
