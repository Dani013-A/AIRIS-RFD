import { Platform } from 'react-native';

// Get backend URL from env, with smart fallbacks for local development
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

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

export const startInterviewSimulation = async (data: InterviewStartRequest) => {
  try {
    const response = await fetch(`${BASE_URL}/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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

export const submitInterviewAnswer = async (data: InterviewAnswerRequest) => {
  try {
    const response = await fetch(`${BASE_URL}/interview/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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

export const generateInterviewReport = async (data: InterviewReportRequest) => {
  try {
    const response = await fetch(`${BASE_URL}/interview/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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

export const transcribeAudio = async (uri: string, mimeType: string) => {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri,
      name: 'recording.m4a',
      type: mimeType,
    } as any);

    const response = await fetch(`${BASE_URL}/interview/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[API Error] POST /interview/transcribe returned ${response.status}: ${errText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.transcription;
  } catch (error: any) {
    console.error('Failed to transcribe audio:', error.message);
    throw error;
  }
};
