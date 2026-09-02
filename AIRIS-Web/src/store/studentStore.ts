import { create } from "zustand";
import {
  StudentListItem,
  StudentFullProfile,
  ScoreHistoryEvent,
  StudentActivityEvent,
} from "../types/user.types";
import {
  fetchStudentsList,
  fetchStudentDetails,
  toggleStudentAccountState,
  deleteStudentAccount,
} from "../services/firebase/userService";

interface StudentState {
  students: StudentListItem[];
  selectedStudent: StudentListItem | null;
  selectedAnalysis: any | null;
  selectedResume: any | null;
  scoreHistory: ScoreHistoryEvent[];
  activityLogs: StudentActivityEvent[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  loadStudents: () => Promise<void>;
  loadStudentProfile: (studentId: string) => Promise<void>;
  toggleAccountStatus: (studentId: string, isDisabled: boolean, adminName: string) => Promise<void>;
  deleteStudent: (studentId: string, adminName: string) => Promise<void>;
  clearSelectedStudent: () => void;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  selectedStudent: null,
  selectedAnalysis: null,
  selectedResume: null,
  scoreHistory: [],
  activityLogs: [],
  loading: false,
  actionLoading: false,
  error: null,

  loadStudents: async () => {
    set({ loading: true, error: null });
    try {
      const list = await fetchStudentsList();
      set({ students: list, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load student profiles.", loading: false });
    }
  },

  loadStudentProfile: async (studentId) => {
    set({
      loading: true,
      error: null,
      selectedStudent: null,
      selectedAnalysis: null,
      selectedResume: null,
      scoreHistory: [],
      activityLogs: [],
    });
    try {
      const profile = await fetchStudentDetails(studentId);
      set({
        selectedStudent: profile.student,
        selectedAnalysis: profile.latestResumeAnalysis,
        selectedResume: profile.latestResume,
        scoreHistory: profile.scoreHistory,
        activityLogs: profile.activityLogs,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to load student profile details.", loading: false });
    }
  },

  toggleAccountStatus: async (studentId, isDisabled, adminName) => {
    set({ actionLoading: true, error: null });
    try {
      await toggleStudentAccountState(studentId, isDisabled, adminName);
      set((state) => ({
        students: state.students.map((s) => (s.uid === studentId ? { ...s, isDisabled } : s)),
        selectedStudent: state.selectedStudent && state.selectedStudent.uid === studentId ? { ...state.selectedStudent, isDisabled } : state.selectedStudent,
        actionLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || "Failed to modify account state.", actionLoading: false });
      throw err;
    }
  },

  deleteStudent: async (studentId, adminName) => {
    set({ actionLoading: true, error: null });
    try {
      await deleteStudentAccount(studentId, adminName);
      set((state) => ({
        students: state.students.filter((s) => s.uid !== studentId),
        selectedStudent: state.selectedStudent && state.selectedStudent.uid === studentId ? null : state.selectedStudent,
        actionLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || "Failed to delete student account.", actionLoading: false });
      throw err;
    }
  },

  clearSelectedStudent: () => set({ selectedStudent: null, selectedAnalysis: null, selectedResume: null, scoreHistory: [], activityLogs: [] }),
}));
