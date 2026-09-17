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
}

export interface PauseMetrics {
  totalPauseDuration: number;
  pauseCount: number;
  pausePeriodEquivalent: number;
  longestPause: number;
  averagePauseDuration: number;
}

export interface InterviewAnswerRequest {
  targetRole: string;
  program: string;
  parsedResume: Record<string, any>;
  history: Array<{ question: string; answer: string; questionType?: string; benchmarkAnswer?: string }>;
  currentQuestion: string;
  currentAnswer: string;
  currentQuestionType: string;
  currentBenchmarkAnswer?: string;
  totalQuestions: number;
  pauseMetrics?: PauseMetrics;
}

export interface InterviewReportRequest {
  targetRole: string;
  program: string;
  parsedResume: Record<string, any>;
  history: Array<any>;
  evaluations: Array<any>;
}

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
      console.error(`[API Error] POST /interview/start returned ${response.status}: ${errText}`);
      let userMsg = "Unable to start the interview right now. Please try again.";
      try {
        const parsed = JSON.parse(errText);
        if (response.status === 400 && parsed?.detail) {
          userMsg = parsed.detail;
        }
      } catch (_) {}
      throw new Error(userMsg);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Failed to start interview:', error.message || error);
    throw error;
  }
};

export const submitInterviewAnswer = async (payload: InterviewAnswerRequest) => {
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
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Error] POST /interview/answer returned ${response.status}: ${errText}`);
      let userMsg = "Unable to evaluate answer right now. Please try again.";
      try {
        const parsed = JSON.parse(errText);
        if (response.status === 400 && parsed?.detail) {
          userMsg = parsed.detail;
        }
      } catch (_) {}
      throw new Error(userMsg);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Failed to submit interview answer:', error.message || error);
    throw error;
  }
};

export const generateInterviewReport = async (payload: InterviewReportRequest) => {
  try {
    const BASE_URL = getBaseUrl();
    const idToken = await getAuthenticatedIdToken();
    const response = await fetch(`${BASE_URL}/interview/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Error] POST /interview/report returned ${response.status}: ${errText}`);
      let userMsg = "Unable to generate interview report. Please try again.";
      try {
        const parsed = JSON.parse(errText);
        if (response.status === 400 && parsed?.detail) {
          userMsg = parsed.detail;
        }
      } catch (_) {}
      throw new Error(userMsg);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Failed to generate interview report:', error.message || error);
    throw error;
  }
};

export const transcribeAudio = async (uri: string, mimeType: string): Promise<{ transcription: string; pauseMetrics?: PauseMetrics }> => {
  try {
    const BASE_URL = getBaseUrl();
    const idToken = await getAuthenticatedIdToken();
    const response = await FileSystem.uploadAsync(`${BASE_URL}/interview/transcribe`, uri, {
      fieldName: 'audio',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 1,
      mimeType: mimeType || 'audio/mp4',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (response.status !== 200) {
      console.error(`[API Error] POST /interview/transcribe returned ${response.status}: ${response.body}`);
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
