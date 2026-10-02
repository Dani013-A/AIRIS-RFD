jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  Alert: { alert: jest.fn() },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../config/firebase", () => ({
  db: {},
  auth: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [], forEach: () => {} })),
  setDoc: jest.fn(),
  runTransaction: jest.fn(),
}));

jest.mock("./authStore", () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      isInitialized: true,
      currentUser: { uid: "user_test_456", activeResumeId: "res_active_456", targetPosition: "Software Engineer" },
    })),
    setState: jest.fn(),
    subscribe: jest.fn(() => () => {}),
  },
}));

const mockFetchActiveResumeFromDb = jest.fn();
const mockFetchAnalysisByIdFromDb = jest.fn();

jest.mock("../services/resume/resumeService", () => ({
  fetchActiveResumeFromDb: (...args: any[]) => mockFetchActiveResumeFromDb(...args),
  fetchAnalysisByIdFromDb: (...args: any[]) => mockFetchAnalysisByIdFromDb(...args),
  saveResumeAndAnalysisTransaction: jest.fn(),
  saveRetargetedAnalysisTransaction: jest.fn(),
}));

jest.mock("../services/firebase/activityService", () => ({
  saveUserActivity: jest.fn().mockResolvedValue(true),
}));

jest.mock("../services/resume/localResumeStorage", () => ({
  saveResumeLocally: jest.fn().mockResolvedValue(true),
}));

jest.mock("../services/resume/selfAssessmentService", () => ({
  extractTargetCompetenciesForSelfAssessment: jest.fn().mockReturnValue([]),
  getStoredSelfAssessments: jest.fn().mockResolvedValue({}),
  saveSelfAssessments: jest.fn().mockResolvedValue(true),
}));

import { useResumeStore } from "./resumeStore";
import { useAuthStore } from "./authStore";

describe("Resume Hydration & Cold-Start Readiness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useResumeStore.getState().clearStore();
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      isInitialized: true,
      currentUser: { uid: "user_test_456", activeResumeId: "res_active_456", targetPosition: "Software Engineer" },
    });
  });

  it("Interview requested before resume hydration completes -> waits for readiness then provides hydrated resume", async () => {
    const mockResumeDoc = {
      resumeId: "res_active_456",
      latestAnalysisId: "ana_active_456",
      rawText: "Sample resume text with Python and TypeScript",
    };
    const mockAnalysisDoc = {
      result: {
        analysisSessionId: "session_456",
        scoringModelVersion: "v2",
        parsedSections: [{ name: "Skills", content: "Python, React" }],
        atsScore: { overallScore: 88 },
      },
    };

    mockFetchActiveResumeFromDb.mockImplementation(async () => {
      // Simulate network roundtrip latency
      await new Promise((r) => setTimeout(r, 20));
      return mockResumeDoc;
    });
    mockFetchAnalysisByIdFromDb.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return mockAnalysisDoc;
    });

    // Initial state: store is not yet populated
    expect(useResumeStore.getState().activeResume).toBeNull();
    expect(useResumeStore.getState().activeAnalysis).toBeNull();

    // Call ensureResumeHydrated (as ImmersiveBriefingScreen and PreSimulationBriefingScreen do)
    const hydrationPromise = useResumeStore.getState().ensureResumeHydrated();

    // While awaiting, verify processing is in-flight
    expect(useResumeStore.getState().processingStatus).toBe("extracting");

    const result = await hydrationPromise;

    expect(result.hasResume).toBe(true);
    expect(result.activeResume?.resumeId).toBe("res_active_456");
    expect(result.activeAnalysis?.analysisSessionId).toBe("session_456");
    expect(useResumeStore.getState().processingStatus).toBe("completed");
    expect(mockFetchActiveResumeFromDb).toHaveBeenCalledWith("user_test_456", "res_active_456");
  });

  it("Hydration completes with no resume -> returns genuine missing-resume state without throwing", async () => {
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      isInitialized: true,
      currentUser: { uid: "user_new_789", activeResumeId: null },
    });

    const result = await useResumeStore.getState().ensureResumeHydrated();

    expect(result.hasResume).toBe(false);
    expect(result.activeResume).toBeNull();
    expect(result.activeAnalysis).toBeNull();
    expect(mockFetchActiveResumeFromDb).not.toHaveBeenCalled();
  });

  it("Hydration completes when resume document is not found in database -> reports missing resume", async () => {
    mockFetchActiveResumeFromDb.mockResolvedValue(null);

    const result = await useResumeStore.getState().ensureResumeHydrated();

    expect(result.hasResume).toBe(false);
    expect(result.activeResume).toBeNull();
    expect(result.activeAnalysis).toBeNull();
    expect(useResumeStore.getState().processingStatus).toBe("failed");
  });

  it("Deduplicates concurrent fetchActiveResume requests into a single database fetch", async () => {
    const mockResumeDoc = {
      resumeId: "res_active_456",
      latestAnalysisId: "ana_active_456",
      rawText: "Sample resume text",
    };
    mockFetchActiveResumeFromDb.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 30));
      return mockResumeDoc;
    });
    mockFetchAnalysisByIdFromDb.mockResolvedValue({
      result: {
        analysisSessionId: "session_456",
        parsedSections: [],
      },
    });

    const call1 = useResumeStore.getState().fetchActiveResume("user_test_456", "res_active_456");
    const call2 = useResumeStore.getState().fetchActiveResume("user_test_456", "res_active_456");

    await Promise.all([call1, call2]);

    expect(mockFetchActiveResumeFromDb).toHaveBeenCalledTimes(1);
    expect(mockFetchAnalysisByIdFromDb).toHaveBeenCalledTimes(1);
  });
});
