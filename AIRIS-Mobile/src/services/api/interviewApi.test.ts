jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { MULTIPART: 1 },
}), { virtual: true });

import { startInterviewSimulation, submitInterviewAnswer, generateInterviewReport, transcribeAudio } from "./interviewApi";
import * as FileSystem from 'expo-file-system/legacy';

describe("Interview API Client (interviewApi)", () => {
  const originalFetch = (globalThis as any).fetch;

  beforeEach(() => {
    (globalThis as any).fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    jest.clearAllMocks();
  });

  test("startInterviewSimulation includes Authorization Bearer token", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ question: "Tell me about yourself", questionType: "introductory" }),
    });

    const result = await startInterviewSimulation({
      targetRole: "Software Engineer",
      program: "BS Computer Science",
      parsedResume: { name: "Test Candidate" },
    });

    expect(result.question).toBe("Tell me about yourself");
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/interview\/start$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-mock-firebase-token",
        }),
      })
    );
  });

  test("submitInterviewAnswer includes Authorization Bearer token", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ score: 85, feedback: "Good answer" }),
    });

    const result = await submitInterviewAnswer({
      targetRole: "Software Engineer",
      program: "BS Computer Science",
      parsedResume: { name: "Test Candidate" },
      history: [],
      currentQuestion: "Tell me about yourself",
      currentAnswer: "I am a software engineer.",
      currentQuestionType: "introductory",
      totalQuestions: 5,
    });

    expect(result.score).toBe(85);
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/interview\/answer$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-mock-firebase-token",
        }),
      })
    );
  });

  test("generateInterviewReport includes Authorization Bearer token", async () => {
    ((globalThis as any).fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ overallScore: 88, summary: "Strong communication" }),
    });

    const result = await generateInterviewReport({
      targetRole: "Software Engineer",
      program: "BS Computer Science",
      parsedResume: { name: "Test Candidate" },
      history: [],
      evaluations: [],
    });

    expect(result.overallScore).toBe(88);
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/interview\/report$/),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-mock-firebase-token",
        }),
      })
    );
  });

  test("transcribeAudio includes Authorization Bearer token", async () => {
    (FileSystem.uploadAsync as jest.Mock).mockResolvedValueOnce({
      status: 200,
      body: JSON.stringify({ transcription: "My audio response", pauseMetrics: { totalPauseDuration: 2.5 } }),
    });

    const result = await transcribeAudio("file:///mock/audio.m4a", "audio/mp4");
    expect(result.transcription).toBe("My audio response");
    expect(FileSystem.uploadAsync).toHaveBeenCalledWith(
      expect.stringMatching(/\/interview\/transcribe$/),
      "file:///mock/audio.m4a",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test-mock-firebase-token",
        },
      })
    );
  });
});
