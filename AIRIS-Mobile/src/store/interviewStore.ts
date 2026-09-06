import { create } from 'zustand';

export type InterviewStatus = 'setup' | 'briefing' | 'active' | 'evaluating' | 'completed';

export interface InterviewSession {
  sessionId: string;
  userId: string;
  targetRole: string;
  program: string;
  resumeId: string;
  interviewType: 'one-on-one' | 'panel' | 'immersive-one-on-one' | 'immersive-panel';
  startedAt: number;
  completedAt?: number;
  totalQuestions: number;

  currentQuestion: string;
  currentQuestionType: string;
  currentBenchmarkAnswer?: string;
  questionsAsked: number; // to track 1 of N

  history: Array<{ question: string; answer: string; questionType?: string; benchmarkAnswer?: string; isInteraction?: boolean }>;
  evaluations: Array<any>;

  finalReport?: any;
}

interface InterviewStore {
  status: InterviewStatus;
  session: InterviewSession | null;

  initializeSession: (data: Partial<InterviewSession> & { firstQuestion: string; firstQuestionType: string; firstQuestionBenchmark?: string }) => void;
  submitAnswer: (answer: string, evaluation: any, nextQuestion?: string, nextQuestionType?: string, nextBenchmark?: string, isComplete?: boolean, isInteractionEvent?: boolean) => void;
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
      currentBenchmarkAnswer: data.firstQuestionBenchmark,
      questionsAsked: 1,
      history: [],
      evaluations: [],
    }
  }),

  submitAnswer: (answer, evaluation, nextQuestion, nextQuestionType, nextBenchmark, isComplete, isInteractionEvent) => set((state) => {
    if (!state.session) return state;

    const updatedHistory = [
      ...state.session.history,
      {
        question: state.session.currentQuestion,
        answer: answer,
        questionType: state.session.currentQuestionType,
        benchmarkAnswer: state.session.currentBenchmarkAnswer,
        isInteraction: isInteractionEvent === true,
      }
    ];

    const updatedEvaluations = evaluation ? [...state.session.evaluations, evaluation] : state.session.evaluations;

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
        currentBenchmarkAnswer: nextBenchmark,
        questionsAsked: isInteractionEvent ? state.session.questionsAsked : state.session.questionsAsked + 1,
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

