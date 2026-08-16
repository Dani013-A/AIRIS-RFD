import { create } from "zustand";

interface OnboardingState {
  college: string;
  degreeProgram: string;
  targetPosition: string;
  setCollege: (college: string) => void;
  setDegreeProgram: (program: string) => void;
  setTargetPosition: (position: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  college: "",
  degreeProgram: "",
  targetPosition: "",
  setCollege: (college) => set({ college, degreeProgram: "", targetPosition: "" }),
  setDegreeProgram: (degreeProgram) => set({ degreeProgram, targetPosition: "" }),
  setTargetPosition: (targetPosition) => set({ targetPosition }),
  reset: () => set({ college: "", degreeProgram: "", targetPosition: "" }),
}));
