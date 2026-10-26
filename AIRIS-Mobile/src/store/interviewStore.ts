import { assertCompletedInterviewReport } from '../services/api/interviewCompletion';
import { create } from 'zustand';
import type { PauseMetrics } from '../services/api/interviewApi';

export type InterviewStatus = 'setup' | 'briefing' | 'active' | 'evaluating' | 'completed';

export interface InterviewSession {
  sessionId: string;
  userId: string;
  targetRole: string;
  program: string;
  resumeId: string;
  interviewType: 'one-on-one' | 'panel' | 'vr' | 'immersive-one-on-one' | 'immersive-panel';
  startedAt: number;
  completedAt?: number;
  totalQuestions: number;

  currentQuestion: string;
  currentQuestionType: string;
  currentBenchmarkAnswer?: string;
  questionsAsked: number; // to track 1 of N

  history: Array<{ question: string; answer: string; questionType?: string; benchmarkAnswer?: string; isInteraction?: boolean; pauseMetrics?: PauseMetrics }>;
  evaluations: Array<any>;

  finalReport?: any;
}

interface InterviewStore {
  status: InterviewStatus;
  session: InterviewSession | null;

  initializeSession: (data: Partial<InterviewSession> & { firstQuestion: string; firstQuestionType: string; firstQuestionBenchmark?: string }) => void;
  submitAnswer: (answer: string, evaluation: any, nextQuestion?: string, nextQuestionType?: string, nextBenchmark?: string, isComplete?: boolean, isInteractionEvent?: boolean, expected?: { sessionId: string; historyLength: number }, pauseMetrics?: PauseMetrics) => boolean;
  completeClosing: () => void;
  setFinalReport: (report: any) => void;
  setStatus: (status: InterviewStatus) => void;
  clearSession: () => void;
  resetSessionForNewInterview: (interviewType: InterviewSession['interviewType']) => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  status: 'setup',
  session: null,

  resetSessionForNewInterview: (interviewType) => set({
    status: 'setup',
    session: {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: '',
      targetRole: '',
      program: '',
      resumeId: '',
      interviewType,
      startedAt: 0,
      totalQuestions: 10,
      currentQuestion: '',
      currentQuestionType: '',
      questionsAsked: 0,
      history: [],
      evaluations: [],
    },
  }),

  initializeSession: (data) => set({
    status: 'briefing',
    session: {
      sessionId: data.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: data.userId || 'guest',
      targetRole: data.targetRole || 'Unknown Role',
      program: data.program || 'Unknown Program',
      resumeId: data.resumeId || 'none',
      interviewType: data.interviewType || 'one-on-one',
      startedAt: Date.now(),
      totalQuestions: data.totalQuestions || 10,
      currentQuestion: data.firstQuestion,
      currentQuestionType: data.firstQuestionType,
      currentBenchmarkAnswer: data.firstQuestionBenchmark,
      questionsAsked: 1,
      history: [],
      evaluations: [],
    }
  }),

  submitAnswer: (answer, evaluation, nextQuestion, nextQuestionType, nextBenchmark, isComplete, isInteractionEvent, expected, pauseMetrics) => {
    let accepted = false;
    set((state) => {
    if (expected && (state.session?.sessionId !== expected.sessionId || state.session.history.length !== expected.historyLength)) return state;
    if (!state.session || state.session.currentQuestionType === 'closing' || ['completed', 'evaluating'].includes(state.status) || !answer.trim()) return state;

    if (!isInteractionEvent && (!evaluation || !Number.isFinite(evaluation.overall ?? evaluation.score) || (evaluation.overall ?? evaluation.score) < 0 || (evaluation.overall ?? evaluation.score) > 100)) return state;
    if (isComplete && state.session.evaluations.length + (evaluation ? 1 : 0) !== 9) return state;

    accepted = true;
    let questionForHistory = state.session.currentQuestion;
    let questionTypeForHistory = state.session.currentQuestionType;
    if (!isInteractionEvent) {
      // Retry prompts are presentation; the accepted answer still belongs to the original topic.
      for (let index = state.session.history.length - 1; index >= 0; index--) {
        const turn = state.session.history[index];
        if (!turn.isInteraction) break;
        questionForHistory = turn.question;
        questionTypeForHistory = turn.questionType ?? questionTypeForHistory;
      }
    }

    const updatedHistory = [
      ...state.session.history,
      {
        question: questionForHistory,
        answer: answer,
        questionType: questionTypeForHistory,
        benchmarkAnswer: state.session.currentBenchmarkAnswer,
        isInteraction: isInteractionEvent === true,
        ...(pauseMetrics ? { pauseMetrics: { ...pauseMetrics } } : {}),
      }
    ];

    const updatedEvaluations = evaluation ? [...state.session.evaluations, evaluation] : state.session.evaluations;

    if (isComplete) {
      return {
        status: 'evaluating',
        session: {
          ...state.session,
          history: updatedHistory,
          evaluations: updatedEvaluations,
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
        currentQuestionType: isInteractionEvent ? state.session.currentQuestionType : nextQuestionType || 'follow-up',
        currentBenchmarkAnswer: isInteractionEvent ? state.session.currentBenchmarkAnswer ?? nextBenchmark : nextBenchmark,
        questionsAsked: (isInteractionEvent === true || nextQuestionType === 'follow-up')
          ? state.session.questionsAsked
          : Math.min(state.session.questionsAsked + 1, state.session.totalQuestions || 10),
      }
    };
  });
    return accepted;
  },

  completeClosing: () => set((state) => {
    if (!state.session || state.session.currentQuestionType !== 'closing' || ['completed', 'evaluating'].includes(state.status) || state.session.evaluations.length !== 9) return state;
    return { status: 'evaluating' };
  }),

  setFinalReport: (report) => set((state) => {
    if (!state.session || state.session.evaluations.length !== 9 || !Number.isFinite(report?.overallPerformance)
      || report.overallPerformance < 0 || report.overallPerformance > 100) return state;
    try { assertCompletedInterviewReport(report, state.session.sessionId); } catch { return state; }
    return {
      status: 'completed',
      session: {
        ...state.session,
        completedAt: report.completedAt,
        finalReport: report,
      }
    };
  }),

  setStatus: (status) => set({ status }),

  clearSession: () => set({ status: 'setup', session: null }),
}));
