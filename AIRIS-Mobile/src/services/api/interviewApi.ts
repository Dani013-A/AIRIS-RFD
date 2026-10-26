import { assertCompletedInterviewReport, InterviewCompletionError } from './interviewCompletion';
import { getApiBaseUrl, getAuthenticatedIdToken } from './apiClient';
import * as FileSystem from 'expo-file-system/legacy';

// Get authoritative backend URL from centralized apiClient resolver
export const getBaseUrl = (): string => {
  return getApiBaseUrl();
};

export interface InterviewStartRequest {
  targetRole: string;
  program: string;
  parsedResume: Record<string, any>;
  resumeId?: string;
  interviewType?: string;
}

export interface PauseMetrics {
  totalPauseDuration: number;
  pauseCount: number;
  pausePeriodEquivalent: number;
  longestPause: number;
  averagePauseDuration: number;
}

export interface InterviewAnswerRequest {
  sessionId: string;
  questionId: string;
  turn: number;
  currentAnswer: string;
}

export interface InterviewReportRequest {
  sessionId: string;
}

export const cancelInterviewSimulation = async (sessionId: string): Promise<void> => {
  if (!/^[a-f0-9]{32}$/.test(sessionId)) return;
  const idToken = await getAuthenticatedIdToken();
  const response = await fetch(`${getBaseUrl()}/interview/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) throw new Error('The server could not confirm interview cancellation.');
};

export const startInterviewSimulation = async (payload: InterviewStartRequest) => {
  try {
    const BASE_URL = getBaseUrl();
    const idToken = await getAuthenticatedIdToken();
    const response = await fetch(`${BASE_URL}/interview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Error] POST /interview/start returned ${response.status}`);
      let userMsg = "Unable to start the interview right now. Please try again.";
      try {
        const parsed = JSON.parse(errText);
        if (response.status === 400 && parsed?.detail) {
          userMsg = parsed.detail;
        }
      } catch (_) {}
      throw new Error(userMsg);
    }
    const result = await response.json();
    if (!/^[a-f0-9]{32}$/.test(result.sessionId || '') || result.turn !== 0) {
      throw new Error('The interview service requires an updated server session. Please try again later.');
    }
    if (/^[a-f0-9]{32}$/.test(result.speechDecisionId || "")) {
      console.log(`[API][INTERVIEW_DECISION] id=${result.speechDecisionId} question=${result.nextQuestion?.questionId || result.questionId || "interaction"}`);
    }
    return result;
  } catch (error: any) {
    console.error('Failed to start interview:', error.message || error);
    throw error;
  }
};

export const submitInterviewAnswer = async (payload: InterviewAnswerRequest, options?: { signal?: AbortSignal }) => {
  try {
    const BASE_URL = getBaseUrl();
    const idToken = await getAuthenticatedIdToken();

    const response = await fetch(`${BASE_URL}/interview/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
      signal: options?.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Error] POST /interview/answer returned ${response.status}`);
      let userMsg = "Unable to evaluate answer right now. Please try again.";
      try {
        const parsed = JSON.parse(errText);
        if (response.status === 400 && parsed?.detail) {
          userMsg = parsed.detail;
        }
      } catch (_) {}
      throw new Error(userMsg);
    }
    const result = await response.json();
    if (result.sessionId !== payload.sessionId || result.turn !== payload.turn + 1) {
      throw new Error('The evaluation belongs to a different interview turn. Please retry.');
    }
    if (/^[a-f0-9]{32}$/.test(result.speechDecisionId || "")) {
      console.log(`[API][INTERVIEW_DECISION] id=${result.speechDecisionId} question=${result.nextQuestion?.questionId || result.questionId || "interaction"}`);
    }
    return result;
  } catch (error: any) {
    console.error('Failed to submit interview answer:', error.message || error);
    throw error;
  }
};

export async function getInterviewCompletionStatus(sessionId: string) {
  const token = await getAuthenticatedIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${getBaseUrl()}/interview/status/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    });
    if (!response.ok) throw new InterviewCompletionError(response.status);
    const result = await response.json();
    if (result?.sessionId !== sessionId || !['in_progress','ready','finalizing','completed'].includes(result.status)) {
      throw new Error('Interview status could not be confirmed.');
    }
    if (result.status === 'completed') assertCompletedInterviewReport(result.report, sessionId);
    return result;
  } finally { clearTimeout(timeout); }
}

export const generateInterviewReport = async (payload: InterviewReportRequest) => {
  const token = await getAuthenticatedIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  let result;
  try {
    const response = await fetch(`${getBaseUrl()}/interview/report`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId: payload.sessionId }), signal: controller.signal,
    });
    if (!response.ok) throw new InterviewCompletionError(response.status);
    result = await response.json();
  } catch (error) {
    if (error instanceof InterviewCompletionError && error.status < 500) throw error;
    // A lost response may follow a successful commit; read status before offering the same-ID retry.
    try {
      const status = await getInterviewCompletionStatus(payload.sessionId);
      if (status.status === 'completed') return status.report;
    } catch { /* Leave the original operation unconfirmed. */ }
    throw error;
  } finally { clearTimeout(timeout); }
  assertCompletedInterviewReport(result, payload.sessionId);
  return result;
};

export const transcribeAudio = async (uri: string, mimeType: string, context?: { sessionId: string; turn: number }): Promise<{ transcription: string; pauseMetrics?: PauseMetrics }> => {
  try {
    const BASE_URL = getBaseUrl();
    const idToken = await getAuthenticatedIdToken();
    const response = await FileSystem.uploadAsync(`${BASE_URL}/interview/transcribe`, uri, {
      fieldName: 'audio',
      parameters: context ? { sessionId: context.sessionId, turn: String(context.turn) } : undefined,
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 1,
      mimeType: mimeType || 'audio/mp4',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (response.status !== 200) {
      console.error(`[API Error] POST /interview/transcribe returned ${response.status}`);
      throw new Error("Unable to transcribe audio response. Please try again.");
    }
    const data = JSON.parse(response.body);
    return {
      transcription: data.transcription || "",
      pauseMetrics: data.pauseMetrics,
    };
  } catch (error: any) {
    console.error('Failed to transcribe audio:', error.message || error);
    throw error;
  }
};
