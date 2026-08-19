import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get backend URL from env, with smart fallbacks for local development
export const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Expo LAN IP (Useful for physical devices on same WiFi)
  const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.hostUri;
  if (hostUri) {
    const lanIp = hostUri.split(':')[0];
    return `http://${lanIp}:8000`;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
};

export interface InterviewStartRequest {
  targetRole: string;
  program: string;
  parsedResume: Record<string, any>;
}

export interface InterviewAnswerRequest {
  targetRole: string;
  program: string;
  parsedResume: Record<string, any>;
  history: Array<{ question: string; answer: string; questionType?: string }>;
  currentQuestion: string;
  currentAnswer: string;
  currentQuestionType: string;
  totalQuestions: number;
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
    const response = await fetch(`${BASE_URL}/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Error] POST /interview/start returned ${response.status}: ${errText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Failed to start interview:', error.message);
    throw error;
  }
};

export const submitInterviewAnswer = async (payload: InterviewAnswerRequest) => {
  try {
    const BASE_URL = getBaseUrl();
    const response = await fetch(`${BASE_URL}/interview/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Error] POST /interview/answer returned ${response.status}: ${errText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Failed to submit interview answer:', error.message);
    throw error;
  }
};

export const generateInterviewReport = async (payload: InterviewReportRequest) => {
  try {
    const BASE_URL = getBaseUrl();
    const response = await fetch(`${BASE_URL}/interview/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Error] POST /interview/report returned ${response.status}: ${errText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.error('Failed to generate interview report:', error.message);
    throw error;
  }
};

import * as FileSystem from 'expo-file-system/legacy';

export const transcribeAudio = async (uri: string, mimeType: string) => {
  try {
    const BASE_URL = getBaseUrl();
    const response = await FileSystem.uploadAsync(`${BASE_URL}/interview/transcribe`, uri, {
      fieldName: 'audio',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 1,
      mimeType: mimeType || 'audio/mp4',
    });

    if (response.status !== 200) {
      console.error(`[API Error] POST /interview/transcribe returned ${response.status}: ${response.body}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = JSON.parse(response.body);
    return data.transcription;
  } catch (error: any) {
    console.error('Failed to transcribe audio:', error.message);
    throw error;
  }
};
