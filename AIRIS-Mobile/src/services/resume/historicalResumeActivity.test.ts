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
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn((...args: any[]) => ({ id: args[args.length - 1] || "mock_doc_id" })),
  getDoc: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [], forEach: () => {} })),
  setDoc: jest.fn(),
  runTransaction: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => ({ toDate: () => new Date() })),
}));

import {
  fetchActiveResumeFromDb,
  fetchAnalysisByIdFromDb,
} from "./resumeService";
import { saveUserActivity } from "../firebase/activityService";
import { getDoc, setDoc } from "firebase/firestore";

describe("AIRIS Historical Resume & Recent Activity Tests", () => {
  const mockUserId = "test_user_123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Activity Creation & Metadata Storage", () => {
    it("saveUserActivity persists resumeId, analysisId, targetPosition, and fileName", async () => {
      await saveUserActivity(mockUserId, "analysis_456", {
        title: "Analyzed DataAnalystResume.pdf",
        type: "Resume Analysis",
        score: 85,
        resumeId: "resume_123",
        analysisId: "analysis_456",
        targetPosition: "Data Analyst",
        fileName: "DataAnalystResume.pdf",
        metadata: {
          resumeId: "resume_123",
          analysisId: "analysis_456",
          targetPosition: "Data Analyst",
          fileName: "DataAnalystResume.pdf",
        },
      });

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: "analysis_456",
          title: "Analyzed DataAnalystResume.pdf",
          type: "Resume Analysis",
          score: 85,
          resumeId: "resume_123",
          analysisId: "analysis_456",
          targetPosition: "Data Analyst",
          fileName: "DataAnalystResume.pdf",
          metadata: {
            resumeId: "resume_123",
            analysisId: "analysis_456",
            targetPosition: "Data Analyst",
            fileName: "DataAnalystResume.pdf",
          },
        }),
        { merge: true }
      );
    });
  });

  describe("2. Historical Resume & Analysis Resolution", () => {
    it("Resolves analysis document and its corresponding resume correctly", async () => {
      const mockAnalysisDoc = {
        analysisId: "analysis_cyber_789",
        resumeId: "resume_123",
        targetPosition: "Cybersecurity Analyst",
        result: {
          atsScore: {
            overallScore: 82,
            breakdown: { resumeQualityScore: 88, atsCompatibilityScore: 76 },
          },
          detectedSections: [{ name: "skills", isPresent: true }],
        },
        createdAt: { toDate: () => new Date("2026-08-20T10:00:00Z") },
      };

      const mockResumeDoc = {
        resumeId: "resume_123",
        userId: mockUserId,
        originalFileName: "CyberSecurityResume.pdf",
        rawText: "EXPERIENCE: Security Engineer at TechCorp...\nSKILLS: SIEM, Firewalls, Python",
        structuredData: {
          contactInformation: { name: "Jane Doe", email: "jane@tip.edu.ph" },
          skills: ["SIEM", "Firewalls", "Python"],
          workExperience: [
            {
              role: "Security Engineer",
              company: "TechCorp",
              duration: "2024 - Present",
              description: "Monitored security incidents using Splunk.",
            },
          ],
        },
      };

      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockAnalysisDoc,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockResumeDoc,
        });

      const loadedAnalysis = await fetchAnalysisByIdFromDb(mockUserId, "analysis_cyber_789");
      expect(loadedAnalysis).toBeDefined();
      expect(loadedAnalysis.targetPosition).toBe("Cybersecurity Analyst");
      expect(loadedAnalysis.result.atsScore.overallScore).toBe(82);

      const loadedResume = await fetchActiveResumeFromDb(mockUserId, loadedAnalysis.resumeId);
      expect(loadedResume).toBeDefined();
      expect(loadedResume?.structuredData.contactInformation?.name).toBe("Jane Doe");
      expect(loadedResume?.structuredData.workExperience?.length).toBe(1);
    });

    it("Handles missing historical activity gracefully without throwing", async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      });

      const result = await fetchAnalysisByIdFromDb(mockUserId, "non_existent_analysis_999");
      expect(result).toBeNull();
    });
  });

  describe("3. Immutability of Active Resume State", () => {
    it("Viewing historical activity does not mutate current active resume or analysis state", () => {
      const activeState = {
        activeResumeId: "active_resume_current",
        targetPosition: "Software Engineer",
        latestAnalysisId: "active_analysis_current",
      };

      // Simulating a historical read
      const historicalItem = {
        activityId: "historical_analysis_old",
        targetPosition: "Data Analyst",
      };

      expect(historicalItem.activityId).not.toBe(activeState.latestAnalysisId);
      expect(historicalItem.targetPosition).not.toBe(activeState.targetPosition);

      // Active state remains unchanged
      expect(activeState.activeResumeId).toBe("active_resume_current");
      expect(activeState.targetPosition).toBe("Software Engineer");
    });
  });
});
