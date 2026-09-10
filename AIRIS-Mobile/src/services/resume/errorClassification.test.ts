import { uploadResumeFileWithProgress } from "./resumeAnalysisService";

describe("Upload Error Classification & Fallback Protection Test Suite", () => {
  const dummyFile = {
    uri: "file:///test/image_resume.heic",
    name: "image_resume.heic",
    mimeType: "image/heic",
    size: 50000,
  };

  const dummyPdfFile = {
    uri: "file:///test/resume.pdf",
    name: "resume.pdf",
    mimeType: "application/pdf",
    size: 25000,
  };

  const originalXHR = (globalThis as any).XMLHttpRequest;
  const originalFormData = (globalThis as any).FormData;

  beforeEach(() => {
    (globalThis as any).FormData = jest.fn().mockImplementation(() => ({
      append: jest.fn(),
    }));
  });

  afterEach(() => {
    (globalThis as any).XMLHttpRequest = originalXHR;
    (globalThis as any).FormData = originalFormData;
  });

  const setupMockXHR = (status: number, responseBody: string, isNetworkError: boolean = false, isTimeout: boolean = false) => {
    class MockXHR {
      upload: any = {};
      status: number;
      responseText: string;
      open = jest.fn();
      send = jest.fn().mockImplementation(() => {
        setTimeout(() => {
          if (isNetworkError) {
            if (typeof this.onerror === "function") this.onerror();
          } else if (isTimeout) {
            if (typeof this.ontimeout === "function") this.ontimeout();
          } else {
            if (typeof this.onload === "function") this.onload();
          }
        }, 0);
      });
      onerror?: () => void;
      ontimeout?: () => void;
      onload?: () => void;

      constructor() {
        this.status = status;
        this.responseText = responseBody;
      }
    }
    (globalThis as any).XMLHttpRequest = MockXHR;
  };

  test("1. HTTP 400 Bad Request is classified as HTTP Application Error and re-thrown without connection failure fallback", async () => {
    setupMockXHR(400, JSON.stringify({ detail: "The uploaded resume appears to belong to a different individual. Please ensure you upload your own resume." }));

    await expect(uploadResumeFileWithProgress(dummyFile, "Software Engineer")).rejects.toMatchObject({
      isHttpError: true,
      status: 400,
      code: "NAME_MISMATCH",
      message: "The uploaded resume appears to belong to a different individual. Please ensure you upload your own resume.",
    });
  });

  test("2. HTTP 401 Unauthorized is classified as HTTP Application Error", async () => {
    setupMockXHR(401, JSON.stringify({ detail: "Authentication token expired." }));

    await expect(uploadResumeFileWithProgress(dummyFile, "Software Engineer")).rejects.toMatchObject({
      isHttpError: true,
      status: 401,
      code: "HTTP_401",
      message: "Authentication token expired.",
    });
  });

  test("3. HTTP 422 Unprocessable Entity is classified as HTTP Application Error", async () => {
    setupMockXHR(422, JSON.stringify({ detail: "Target position is required." }));

    await expect(uploadResumeFileWithProgress(dummyFile, "Software Engineer")).rejects.toMatchObject({
      isHttpError: true,
      status: 422,
      code: "HTTP_422",
      message: "Target position is required.",
    });
  });

  test("4. HTTP 500 Internal Server Error is classified as HTTP Application Error", async () => {
    setupMockXHR(500, JSON.stringify({ detail: "Internal AI processing error." }));

    await expect(uploadResumeFileWithProgress(dummyFile, "Software Engineer")).rejects.toMatchObject({
      isHttpError: true,
      status: 500,
      code: "HTTP_500",
      message: "Internal AI processing error.",
    });
  });

  test("5. Actual network connection failure is classified as network connection error", async () => {
    setupMockXHR(0, "", true, false);

    await expect(uploadResumeFileWithProgress(dummyPdfFile, "Software Engineer")).rejects.toThrow(
      "Unable to connect to backend server for file processing."
    );
  });

  test("6. Valid backend HTTP 200 response follows normal analysis pipeline", async () => {
    setupMockXHR(200, JSON.stringify({
      valid: true,
      rawText: "JUAN DELA CRUZ\nSoftware Engineer\nSkills: Python, SQL",
      parsedSections: { Skills: "Python, SQL" },
      atsScore: { overallScore: 85 }
    }));

    const result = await uploadResumeFileWithProgress(dummyPdfFile, "Software Engineer");
    expect(result.rawText).toContain("JUAN DELA CRUZ");
    expect(result.analysisResult).toBeDefined();
  });

  test("7. Image upload does not fall into sandboxed local parser when backend returns HTTP application error", async () => {
    setupMockXHR(400, JSON.stringify({ detail: "This document doesn't appear to be a resume or CV." }));

    await expect(uploadResumeFileWithProgress(dummyFile, "Software Engineer")).rejects.toMatchObject({
      isHttpError: true,
      status: 400,
      code: "INVALID_RESUME",
    });
  });

  test("8. Existing invalid-resume hard blocking remains intact for HTTP 400 response with valid: false", async () => {
    setupMockXHR(200, JSON.stringify({
      valid: false,
      message: "This document doesn't appear to be a resume or CV. Please upload a valid resume."
    }));

    await expect(uploadResumeFileWithProgress(dummyFile, "Software Engineer")).rejects.toMatchObject({
      isHttpError: true,
      status: 400,
      code: "INVALID_RESUME",
      message: "This document doesn't appear to be a resume or CV. Please upload a valid resume.",
    });
  });
});
