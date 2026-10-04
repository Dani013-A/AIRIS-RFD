import { create } from "zustand";
import {
  StudentListItem,
  ScoreHistoryEvent,
  StudentActivityEvent,
  StoredResumeAnalysis,
} from "../types/user.types";
import {
  fetchStudentsList,
  fetchStudentDetails,
  toggleStudentAccountState,
  deleteStudentAccount,
  StudentFilterOptions,
} from "../services/firebase/userService";

interface ActorInfo {
  name: string;
  uid: string;
  role: string;
}

interface StudentState {
  students: StudentListItem[];
  selectedStudent: StudentListItem | null;
  selectedAnalysis: StoredResumeAnalysis | null;
  selectedResume: any | null;
  selectedInterview: any | null;
  scoreHistory: ScoreHistoryEvent[];
  activityLogs: StudentActivityEvent[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  loadStudents: (filters?: StudentFilterOptions, force?: boolean) => Promise<void>;
  loadStudentProfile: (studentId: string) => Promise<void>;
  toggleAccountStatus: (studentId: string, isDisabled: boolean, actor: ActorInfo) => Promise<void>;
  deleteStudent: (studentId: string, actor: ActorInfo) => Promise<void>;
  clearSelectedStudent: () => void;
}

let activeProfileRequest = 0;

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  selectedStudent: null,
  selectedAnalysis: null,
  selectedResume: null,
  selectedInterview: null,
  scoreHistory: [],
  activityLogs: [],
  loading: false,
  actionLoading: false,
  error: null,

  loadStudents: async (filters, force = false) => {
    if (!force && get().loading) return;
    set({ loading: true, error: null });
    try {
      const list = await fetchStudentsList(filters);
      set({ students: list, loading: false, error: null });
    } catch (err: any) {
      console.error("Failed to load students list from Firestore:", err);
      set({ error: err.message || "Failed to query Firestore student records.", loading: false });
    }
  },

  loadStudentProfile: async (studentId) => {
    const requestId = ++activeProfileRequest;
    set({
      loading: true,
      error: null,
      selectedStudent: null,
      selectedAnalysis: null,
      selectedResume: null,
      selectedInterview: null,
      scoreHistory: [],
      activityLogs: [],
    });
    try {
      const profile = await fetchStudentDetails(studentId);
      if (requestId !== activeProfileRequest) return;
      set({
        selectedStudent: profile.student,
        selectedAnalysis: profile.latestResumeAnalysis,
        selectedResume: profile.latestResume,
        selectedInterview: profile.latestInterview,
        scoreHistory: profile.scoreHistory,
        activityLogs: profile.activityLogs,
        loading: false,
      });
    } catch (err: any) {
      if (requestId !== activeProfileRequest) return;
      set({ error: err.message || "Failed to load student profile details.", loading: false });
    }
  },

  toggleAccountStatus: async (studentId, isDisabled, actor) => {
    set({ actionLoading: true, error: null });
    try {
      await toggleStudentAccountState(studentId, isDisabled, actor);
      set((state) => ({
        students: state.students.map((s) => (s.uid === studentId ? { ...s, isDisabled } : s)),
        selectedStudent:
          state.selectedStudent && state.selectedStudent.uid === studentId
            ? { ...state.selectedStudent, isDisabled }
            : state.selectedStudent,
        actionLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || "Failed to modify account state.", actionLoading: false });
      throw err;
    }
  },

  deleteStudent: async (studentId, actor) => {
    set({ actionLoading: true, error: null });
    try {
      await deleteStudentAccount(studentId, actor);
      set((state) => ({
        students: state.students.filter((s) => s.uid !== studentId),
        selectedStudent:
          state.selectedStudent && state.selectedStudent.uid === studentId ? null : state.selectedStudent,
        actionLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || "Failed to delete student account.", actionLoading: false });
      throw err;
    }
  },

  clearSelectedStudent: () => {
    activeProfileRequest++;
    set({
      selectedStudent: null,
      selectedAnalysis: null,
      selectedResume: null,
      selectedInterview: null,
      scoreHistory: [],
      activityLogs: [],
      loading: false,
      error: null,
    });
  },
}));
