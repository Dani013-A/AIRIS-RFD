import { create } from 'zustand';

export type InterviewStatus = 'setup' | 'briefing' | 'active' | 'evaluating' | 'completed';

export interface InterviewSession {
  sessionId: string;
  userId: string;
  targetRole: string;
  program: string;
  resumeId: string;
  interviewType: 'one-on-one' | 'panel' | 'vr';
  startedAt: number;
  completedAt?: number;
  totalQuestions: number;
  
  // Progress
  currentQuestion: string;
  currentQuestionType: string;
  questionsAsked: number; // to track 1 of N

  // History for Backend
  history: Array<{ question: string; answer: string; questionType?: string }>;
  evaluations: Array<any>;
  
  // Final
  finalReport?: any;
}

interface InterviewStore {
  status: InterviewStatus;
  session: InterviewSession | null;
  
  // Actions
  initializeSession: (data: Partial<InterviewSession> & { firstQuestion: string; firstQuestionType: string }) => void;
  submitAnswer: (answer: string, evaluation: any, nextQuestion?: string, nextQuestionType?: string, isComplete?: boolean) => void;
  setFinalReport: (report: any) => void;
  setStatus: (status: InterviewStatus) => void;
  clearSession: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  status: 'setup',
  session: null,

  initializeSession: (data) => set({
    status: 'briefing',
    session: {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: data.userId || 'guest',
      targetRole: data.targetRole || 'Unknown Role',
      program: data.program || 'Unknown Program',
      resumeId: data.resumeId || 'none',
      interviewType: data.interviewType || 'one-on-one',
      startedAt: Date.now(),
      totalQuestions: data.totalQuestions || 5, // default 5 questions for now
      currentQuestion: data.firstQuestion,
      currentQuestionType: data.firstQuestionType,
      questionsAsked: 1,
      history: [],
      evaluations: [],
    }
  }),

  submitAnswer: (answer, evaluation, nextQuestion, nextQuestionType, isComplete) => set((state) => {
    if (!state.session) return state;

    const updatedHistory = [
      ...state.session.history,
      {
        question: state.session.currentQuestion,
        answer: answer,
        questionType: state.session.currentQuestionType,
      }
    ];

    const updatedEvaluations = [...state.session.evaluations, evaluation];

    if (isComplete) {
      return {
        status: 'completed',
        session: {
          ...state.session,
          history: updatedHistory,
          evaluations: updatedEvaluations,
          completedAt: Date.now(),
        }
      };
    }

    return {
      status: 'active',
      session: {
        ...state.session,
        history: updatedHistory,
        evaluations: updatedEvaluations,
        currentQuestion: nextQuestion || 'Please continue.',
        currentQuestionType: nextQuestionType || 'follow-up',
        questionsAsked: state.session.questionsAsked + 1,
      }
    };
  }),

  setFinalReport: (report) => set((state) => {
    if (!state.session) return state;
    return {
      session: {
        ...state.session,
        finalReport: report,
      }
    };
  }),

  setStatus: (status) => set({ status }),

  clearSession: () => set({ status: 'setup', session: null }),
}));
