import { create } from "zustand";
import { StudentListItem } from "../types/user.types";
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
    set({ loading: true, error: null, selectedStudent: null, selectedAnalysis: null, selectedResume: null });
    try {
      const studentDetails = await fetchStudentDetails(studentId);
      set({
        selectedStudent: studentDetails.student,
        selectedAnalysis: studentDetails.resumeAnalysis,
        selectedResume: studentDetails.resume,
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
      const updatedList = get().students.map((s) => (s.uid === studentId ? { ...s, isDisabled } : s));
      const activeSelected = get().selectedStudent;
      const updatedSelection = activeSelected && activeSelected.uid === studentId ? { ...activeSelected, isDisabled } : activeSelected;

      set({ students: updatedList, selectedStudent: updatedSelection, actionLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to modify student account status.", actionLoading: false });
      throw err;
    }
  },

  deleteStudent: async (studentId, adminName) => {
    set({ actionLoading: true, error: null });
    try {
      await deleteStudentAccount(studentId, adminName);
      const remainingList = get().students.filter((s) => s.uid !== studentId);
      set({ students: remainingList, selectedStudent: null, selectedAnalysis: null, selectedResume: null, actionLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to delete student account.", actionLoading: false });
      throw err;
    }
  },

  clearSelectedStudent: () => set({ selectedStudent: null, selectedAnalysis: null, selectedResume: null }),
}));
