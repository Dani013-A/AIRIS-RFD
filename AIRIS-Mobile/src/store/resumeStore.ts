import { create } from "zustand";
import type { Resume, ResumeExtractionMethod, ResumeSourceFileType, ResumeProcessingStatus } from "../types/resume.types";
import type { ResumeAnalysisResult } from "../services/resume/resumeAnalysisEngine";
import {
  saveResumeAndAnalysisTransaction,
  fetchActiveResumeFromDb,
  fetchAnalysisByIdFromDb,
} from "../services/resume/resumeService";
import { parseAndBuildStructuredData } from "../services/resume/resumeParser";
import { normalizeResumeText, validateResumeText } from "../services/resume/resumeNormalizer";
import { calculateAtsCompatibility } from "../services/resume/resumeAnalysisService";
import { saveResumeLocally } from "../services/resume/localResumeStorage";
import { useAuthStore } from "./authStore";
import { saveUserActivity } from "../services/firebase/activityService";

interface ResumeState {
  activeResume: Resume | null;
  activeAnalysis: ResumeAnalysisResult | null;
  processingStatus: ResumeProcessingStatus;
  error: string | null;

  fetchActiveResume: (userId: string, activeResumeId: string) => Promise<void>;
  uploadAndProcessResume: (
    userId: string,
    targetPosition: string,
    file: { name: string; mimeType: string; uri?: string },
    sourceFileType: ResumeSourceFileType,
    extractionMethod: ResumeExtractionMethod,
    rawText: string
  ) => Promise<void>;
  setProcessingStatus: (status: ResumeProcessingStatus) => void;
  clearAnalysisState: () => void;
  clearStore: () => void;
}

export const useResumeStore = create<ResumeState>((set) => ({
  activeResume: null,
  activeAnalysis: null,
  processingStatus: "idle",
  error: null,

  fetchActiveResume: async (userId, activeResumeId) => {
    if (!activeResumeId) {
      set({ activeResume: null, activeAnalysis: null, error: null, processingStatus: "idle" });
      return;
    }

    try {
      set({ processingStatus: "extracting", error: null });
      const resume = await fetchActiveResumeFromDb(userId, activeResumeId);
      if (!resume) {
        set({
          activeResume: null,
          activeAnalysis: null,
          processingStatus: "failed",
          error: "Active resume not found.",
        });
        return;
      }

      let analysisResult: ResumeAnalysisResult | null = null;
      if (resume.latestAnalysisId) {
        const analysisDoc = await fetchAnalysisByIdFromDb(userId, resume.latestAnalysisId);
        if (analysisDoc) {
          analysisResult = analysisDoc.result;
        }
      }

      set({
        activeResume: resume,
        activeAnalysis: analysisResult,
        processingStatus: "completed",
        error: null,
      });
    } catch (err) {
      set({
        processingStatus: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  uploadAndProcessResume: async (
    userId,
    targetPosition,
    file,
    sourceFileType,
    extractionMethod,
    rawText
  ) => {
    try {
      set({ processingStatus: "validating", error: null });

      const normalized = normalizeResumeText(rawText);
      validateResumeText(normalized);

      set({ processingStatus: "parsing" });
      const structuredData = parseAndBuildStructuredData(normalized);

      set({ processingStatus: "analyzing" });
      const analysisResult = await calculateAtsCompatibility(normalized, targetPosition);

      set({ processingStatus: "saving" });
      const { resume } = await saveResumeAndAnalysisTransaction(
        userId,
        file.name,
        file.mimeType,
        sourceFileType,
        extractionMethod,
        normalized,
        structuredData,
        analysisResult
      );

      await saveUserActivity(userId, resume.latestAnalysisId!, {
        title: `Analyzed ${file.name}`,
        type: "Resume Analysis",
        score: analysisResult.atsScore.overallScore
      });

      // Save locally for offline access.
      await saveResumeLocally(
        userId,
        resume.resumeVersion,
        file.uri || "",
        file.name,
        file.mimeType || "application/octet-stream",
        normalized,
        resume.resumeId,
        analysisResult.atsScore.overallScore,
        analysisResult.atsScore.breakdown?.atsCompatibilityScore ?? 0,
        analysisResult.atsScore.breakdown?.resumeQualityScore ?? 0
      );

      set({
        activeResume: resume,
        activeAnalysis: analysisResult,
        processingStatus: "completed",
        error: null,
      });

      const currentAuthUser = useAuthStore.getState().currentUser;
      if (currentAuthUser) {
        useAuthStore.setState({
          currentUser: {
            ...currentAuthUser,
            activeResumeId: resume.resumeId,
            hasUploadedResume: true,
          },
        });
      }
    } catch (err) {
      set({
        processingStatus: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  setProcessingStatus: (status) => set({ processingStatus: status }),

  clearAnalysisState: () => set({
    activeResume: null,
    activeAnalysis: null,
    processingStatus: "idle",
    error: null
  }),

  clearStore: () => set({ activeResume: null, activeAnalysis: null, processingStatus: "idle", error: null }),
}));

let lastUid: string | null = null;
let lastActiveResumeId: string | null = null;

useAuthStore.subscribe((state) => {
  const currentUser = state.currentUser;
  const currentUid = currentUser?.uid || null;
  const currentActiveResumeId = currentUser?.activeResumeId || null;

  if (currentUid !== lastUid || currentActiveResumeId !== lastActiveResumeId) {
    lastUid = currentUid;
    lastActiveResumeId = currentActiveResumeId;

    if (!currentUid) {
      useResumeStore.getState().clearStore();
    } else if (currentActiveResumeId) {
      const resumeState = useResumeStore.getState();
      const activeResume = resumeState.activeResume;

      // Do not resurrect the old resume if we are currently uploading a new one!
      if (resumeState.processingStatus === "idle" || resumeState.processingStatus === "completed" || resumeState.processingStatus === "failed") {
        if (!activeResume || activeResume.resumeId !== currentActiveResumeId) {
          useResumeStore.getState().fetchActiveResume(currentUid, currentActiveResumeId);
        }
      }
    } else {
      const activeResume = useResumeStore.getState().activeResume;
      if (activeResume) {
        useResumeStore.getState().clearStore();
      }
    }
  }
});
