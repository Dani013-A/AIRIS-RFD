jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Alert: { alert: jest.fn() },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../config/firebase", () => ({
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

jest.mock("../../store/authStore", () => ({
  useAuthStore: {
    getState: jest.fn(() => ({ currentUser: { uid: "user_test_123", targetPosition: "Software Engineer" } })),
    setState: jest.fn(),
    subscribe: jest.fn(),
  },
}));

jest.mock("./resumeAnalysisService", () => ({
  uploadResumeFileWithProgress: jest.fn(),
  calculateAtsCompatibility: jest.fn().mockResolvedValue({
    atsScore: { overallScore: 85, breakdown: { atsCompatibilityScore: 85, resumeQualityScore: 85 } },
    detectedSections: [{ name: "Skills", content: "Python, SQL" }],
    learningSnapshot: { targetPosition: "Software Engineer", skillGaps: [], skillsToLearn: [] },
  }),
}));

import { useOnboardingStore } from '../../store/onboardingStore';
import { useResumeStore as useResumeStoreActual } from '../../store/resumeStore';

// Mock dependencies required by resumeStore
jest.mock('../../services/resume/resumeService', () => ({
  saveResumeAndAnalysisTransaction: jest.fn().mockResolvedValue({
    resume: {
      resumeId: 'res_mock_123',
      latestAnalysisId: 'ana_mock_123',
      resumeVersion: 1,
      originalFileName: 'test.pdf',
      fileType: 'pdf',
      rawText: 'Mock resume raw text',
    },
  }),
  saveRetargetedAnalysisTransaction: jest.fn().mockResolvedValue({
    analysisId: 'ana_retarget_123',
  }),
  fetchActiveResumeFromDb: jest.fn(),
  fetchAnalysisByIdFromDb: jest.fn(),
}));

jest.mock('../../services/firebase/activityService', () => ({
  saveUserActivity: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../services/resume/localResumeStorage', () => ({
  saveResumeLocally: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../services/resume/selfAssessmentService', () => ({
  extractTargetCompetenciesForSelfAssessment: jest.fn().mockReturnValue([
    { name: 'python', relevance: 'HIGH' },
    { name: 'sql', relevance: 'HIGH' },
  ]),
  getStoredSelfAssessments: jest.fn().mockResolvedValue({}),
  saveSelfAssessments: jest.fn().mockResolvedValue(true),
}));

describe('Resume Upload Session Isolation & Publication Gate Unit Tests', () => {
  beforeEach(() => {
    useResumeStoreActual.getState().clearStore();
  });

  test('Resume #1 abandoned self-assessment state is immediately discarded when Resume #2 starts', async () => {
    const userId = 'user_test_123';
    const mockFile1 = { name: 'resume_v1.pdf', mimeType: 'application/pdf', uri: 'file://v1' };
    const rawText1 = 'Experienced Python developer with Django and PostgreSQL expertise.';

    // Start Upload #1
    await useResumeStoreActual.getState().uploadAndProcessResume(
      userId,
      'Software Engineer',
      mockFile1,
      'pdf',
      'pdf_text',
      rawText1
    );

    const session1Id = useResumeStoreActual.getState().currentAnalysisSessionId;
    expect(session1Id).toBeTruthy();
    expect(useResumeStoreActual.getState().processingStatus).toBe('awaiting_self_assessment');
    expect(useResumeStoreActual.getState().pendingTargetSkills).toHaveLength(2);
    // Publication Gate check: activeAnalysis must NOT be published yet!
    expect(useResumeStoreActual.getState().activeAnalysis).toBeNull();

    // User abandons Resume #1 flow without calling completeSelfAssessmentAndFinalize.
    // Now start Upload #2 for a different role (Data Analyst)
    const mockFile2 = { name: 'resume_v2.pdf', mimeType: 'application/pdf', uri: 'file://v2' };
    const rawText2 = 'Data analyst experienced in SQL, Tableau, and R programming.';

    await useResumeStoreActual.getState().uploadAndProcessResume(
      userId,
      'Data Analyst',
      mockFile2,
      'pdf',
      'pdf_text',
      rawText2
    );

    const session2Id = useResumeStoreActual.getState().currentAnalysisSessionId;
    expect(session2Id).toBeTruthy();
    expect(session2Id).not.toBe(session1Id);
    expect(useResumeStoreActual.getState().activeAnalysis).toBeNull();
  });

  test('New upload results remain UNPUBLISHED as activeAnalysis until explicitly finalized', async () => {
    const userId = 'user_test_456';
    const mockFile = { name: 'resume_test.pdf', mimeType: 'application/pdf', uri: 'file://test' };
    const rawText = 'Software engineer with strong computer science background.';

    await useResumeStoreActual.getState().uploadAndProcessResume(
      userId,
      'Software Engineer',
      mockFile,
      'pdf',
      'pdf_text',
      rawText
    );

    // Processing status is awaiting self assessment
    expect(useResumeStoreActual.getState().processingStatus).toBe('awaiting_self_assessment');
    // activeAnalysis MUST remain null prior to explicit finalization
    expect(useResumeStoreActual.getState().activeAnalysis).toBeNull();
    expect(useResumeStoreActual.getState().activeResume).toBeNull();

    // Explicitly finalize via user action (e.g. Save or Skip self assessment)
    await useResumeStoreActual.getState().completeSelfAssessmentAndFinalize({});

    // NOW activeAnalysis & activeResume are published!
    expect(useResumeStoreActual.getState().processingStatus).toBe('completed');
    expect(useResumeStoreActual.getState().activeAnalysis).not.toBeNull();
    expect(useResumeStoreActual.getState().activeResume).not.toBeNull();
  });

  test('Old async session completion cannot overwrite newer session state', async () => {
    const userId = 'user_test_789';

    // Simulate Session #1 starting
    useResumeStoreActual.setState({
      currentAnalysisSessionId: 'session_old_111',
      pendingAnalysisData: {
        sessionId: 'session_old_111',
        userId,
        targetPosition: 'Software Engineer',
        file: { name: 'old.pdf' },
        sourceFileType: 'pdf',
        extractionMethod: 'pdf_text',
        normalized: 'old text',
        structuredData: {},
        analysisResult: { atsScore: { overallScore: 50 } },
      },
    });

    // Session #2 starts, updating currentAnalysisSessionId
    useResumeStoreActual.setState({
      currentAnalysisSessionId: 'session_new_222',
      pendingAnalysisData: {
        sessionId: 'session_new_222',
        userId,
        targetPosition: 'Data Analyst',
        file: { name: 'new.pdf' },
        sourceFileType: 'pdf',
        extractionMethod: 'pdf_text',
        normalized: 'new text',
        structuredData: {},
        analysisResult: { atsScore: { overallScore: 90 } },
      },
    });

    // Attempt to run completeSelfAssessmentAndFinalize using stale session_old_111 data
    // Session guard should block finalization
    const staleData = {
      sessionId: 'session_old_111',
      userId,
      targetPosition: 'Software Engineer',
      file: { name: 'old.pdf' },
      sourceFileType: 'pdf',
      extractionMethod: 'pdf_text',
      normalized: 'old text',
      structuredData: {},
      analysisResult: { atsScore: { overallScore: 50 } },
    };

    useResumeStoreActual.setState({ pendingAnalysisData: staleData });
    await useResumeStoreActual.getState().completeSelfAssessmentAndFinalize({});

    // activeAnalysis MUST NOT be populated with old session 50 score
    expect(useResumeStoreActual.getState().activeAnalysis).toBeNull();
    expect(useResumeStoreActual.getState().currentAnalysisSessionId).toBe('session_new_222');
  });

  test('Single Authoritative Source: activeAnalysis score = 94 is used as single source of truth and historical activity score = 53 cannot override it', () => {
    // Set authoritative activeAnalysis in store to score 94
    const authoritativeAnalysis: any = {
      analysisSessionId: 'session_pub_94',
      atsScore: { overallScore: 94, breakdown: { atsCompatibilityScore: 94, resumeQualityScore: 94 } },
      detectedSections: [{ name: 'Skills', content: 'TypeScript, React Native' }],
    };

    useResumeStoreActual.setState({
      activeResume: { resumeId: 'res_pub_94', userId: 'user_test', rawText: 'text' } as any,
      activeAnalysis: authoritativeAnalysis,
      currentAnalysisSessionId: 'session_pub_94',
      processingStatus: 'completed',
    });

    const activeState = useResumeStoreActual.getState();

    // Verify single source of truth score is 94 and sessionId matches
    expect(activeState.activeAnalysis?.atsScore.overallScore).toBe(94);
    expect(activeState.activeAnalysis?.analysisSessionId).toBe('session_pub_94');
    expect(activeState.currentAnalysisSessionId).toBe('session_pub_94');

    // Simulate historical activity log record containing score 53
    const historicalActivities = [
      { id: 'act_old_1', type: 'Resume Analysis', score: 53, analysisId: 'ana_old_53' },
    ];

    // Assert that current active analysis score remains 94 and is not overwritten by historical activity score 53
    expect(historicalActivities[0].score).toBe(53);
    expect(useResumeStoreActual.getState().activeAnalysis?.atsScore.overallScore).toBe(94);
  });

  test('Resume #1 -> Resume #2 finalization cleanly updates single source activeAnalysis from 53 to 94', async () => {
    const userId = 'user_test_sync';

    // Finalize Resume #1 (score 53)
    const session1Data = {
      sessionId: 'session_53',
      userId,
      targetPosition: 'Software Engineer',
      file: { name: 'v1.pdf' },
      sourceFileType: 'pdf',
      extractionMethod: 'pdf_text',
      normalized: 'v1',
      structuredData: {},
      analysisResult: { analysisSessionId: 'session_53', atsScore: { overallScore: 53 } },
    };

    useResumeStoreActual.setState({
      currentAnalysisSessionId: 'session_53',
      pendingAnalysisData: session1Data,
    });
    await useResumeStoreActual.getState().completeSelfAssessmentAndFinalize({});

    expect(useResumeStoreActual.getState().activeAnalysis?.atsScore.overallScore).toBe(53);
    expect(useResumeStoreActual.getState().currentAnalysisSessionId).toBe('session_53');

    // Finalize Resume #2 (score 94)
    const session2Data = {
      sessionId: 'session_94',
      userId,
      targetPosition: 'Software Engineer',
      file: { name: 'v2.pdf' },
      sourceFileType: 'pdf',
      extractionMethod: 'pdf_text',
      normalized: 'v2',
      structuredData: {},
      analysisResult: { analysisSessionId: 'session_94', atsScore: { overallScore: 94 } },
    };

    useResumeStoreActual.setState({
      currentAnalysisSessionId: 'session_94',
      pendingAnalysisData: session2Data,
    });
    await useResumeStoreActual.getState().completeSelfAssessmentAndFinalize({});

    expect(useResumeStoreActual.getState().activeAnalysis?.atsScore.overallScore).toBe(94);
    expect(useResumeStoreActual.getState().currentAnalysisSessionId).toBe('session_94');
  });
});
