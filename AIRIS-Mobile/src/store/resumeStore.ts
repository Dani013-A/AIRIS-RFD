import { create } from "zustand";
import type { Resume, ResumeExtractionMethod, ResumeSourceFileType, ResumeProcessingStatus } from "../types/resume.types";
import type { ResumeAnalysisResult } from "../services/resume/resumeAnalysisEngine";
import {
  saveResumeAndAnalysisTransaction,
  saveRetargetedAnalysisTransaction,
  fetchActiveResumeFromDb,
  fetchAnalysisByIdFromDb,
} from "../services/resume/resumeService";
import { parseAndBuildStructuredData } from "../services/resume/resumeParser";
import { normalizeResumeText, validateResumeText } from "../services/resume/resumeNormalizer";
import { calculateAtsCompatibility } from "../services/resume/resumeAnalysisService";
import { saveResumeLocally } from "../services/resume/localResumeStorage";
import { useAuthStore } from "./authStore";
import { saveUserActivity } from "../services/firebase/activityService";
import {
  matchLearningRecommendations,
  logForYouRecommendations,
} from "../services/learning/learningCatalogService";

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
    rawText: string,
    precomputedAnalysis?: ResumeAnalysisResult
  ) => Promise<void>;
  retargetActiveResume: (newTargetPosition: string) => Promise<void>;
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
    rawText,
    precomputedAnalysis
  ) => {
    try {
      set({ processingStatus: "validating", error: null });

      const normalized = normalizeResumeText(rawText);
      validateResumeText(normalized);

      set({ processingStatus: "parsing" });
      const structuredData = parseAndBuildStructuredData(normalized);

      set({ processingStatus: "analyzing" });
      const analysisResult = precomputedAnalysis || (await calculateAtsCompatibility(normalized, targetPosition));

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
        score: analysisResult.atsScore.overallScore,
        resumeId: resume.resumeId,
        analysisId: resume.latestAnalysisId!,
        targetPosition: analysisResult.learningSnapshot?.targetPosition || targetPosition || "",
        fileName: file.name,
        metadata: {
          resumeId: resume.resumeId,
          analysisId: resume.latestAnalysisId!,
          targetPosition: analysisResult.learningSnapshot?.targetPosition || targetPosition || "",
          fileName: file.name,
        },
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

      // Log the exact For You recommendations upon processing
      try {
        const forYouItems = matchLearningRecommendations({
          targetPosition,
          skillGaps: analysisResult.learningSnapshot?.skillGaps,
          skillsToLearn: analysisResult.learningSnapshot?.skillsToLearn,
          detectedSkills: analysisResult.learningSnapshot?.careerContext?.detectedSkills,
          missingSkills: analysisResult.learningSnapshot?.careerContext?.missingSkills,
          learningSnapshot: analysisResult.learningSnapshot,
          categoryId: "for_you",
          resourceType: "all",
        });
        if (forYouItems && forYouItems.length > 0) {
          logForYouRecommendations(
            userId,
            targetPosition || "General Track",
            analysisResult.learningSnapshot?.skillGaps,
            forYouItems
          );
        }
      } catch (logErr) {
        // Quiet logging
      }

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

  retargetActiveResume: async (newTargetPosition: string) => {
    const state = useResumeStore.getState();
    const activeResume = state.activeResume;
    const currentUser = useAuthStore.getState().currentUser;

    if (!activeResume || !activeResume.rawText || !currentUser) {
      console.log("[AIRIS Retarget] No active resume found to retarget.");
      return;
    }

    const previousRole = currentUser.targetPosition || "General Track";
    console.log("============================================================");
    console.log("AIRIS — CAREER RETARGET");
    console.log("============================================================");
    console.log(`Previous Role: ${previousRole}`);
    console.log(`New Role: ${newTargetPosition}`);
    console.log("Resume: Existing Resume");
    console.log("Action: Intentional Role Retarget Analysis");
    console.log("Status: STARTED");
    console.log("============================================================");

    try {
      set({ processingStatus: "analyzing", error: null });

      // Run ONE intentional calculation against the new target position
      const newAnalysisResult = await calculateAtsCompatibility(activeResume.rawText, newTargetPosition);

      set({ processingStatus: "saving" });

      // Save new analysis document & update latestAnalysisId atomically
      const { analysisId } = await saveRetargetedAnalysisTransaction(
        currentUser.uid,
        activeResume.resumeId,
        newTargetPosition,
        newAnalysisResult
      );

      // Log user activity
      await saveUserActivity(currentUser.uid, analysisId, {
        title: `Re-targeted resume for ${newTargetPosition}`,
        type: "Resume Analysis",
        score: newAnalysisResult.atsScore.overallScore,
        resumeId: activeResume.resumeId,
        analysisId: analysisId,
        targetPosition: newTargetPosition,
        fileName: activeResume.originalFileName,
        metadata: {
          resumeId: activeResume.resumeId,
          analysisId: analysisId,
          targetPosition: newTargetPosition,
          fileName: activeResume.originalFileName,
        },
      });

      // Update local cache
      await saveResumeLocally(
        currentUser.uid,
        activeResume.resumeVersion,
        "",
        activeResume.originalFileName,
        activeResume.fileType,
        activeResume.rawText,
        activeResume.resumeId,
        newAnalysisResult.atsScore.overallScore,
        newAnalysisResult.atsScore.breakdown?.atsCompatibilityScore ?? 0,
        newAnalysisResult.atsScore.breakdown?.resumeQualityScore ?? 0
      );

      // Make new analysis active ONLY after success
      set({
        activeResume: {
          ...activeResume,
          latestAnalysisId: analysisId,
        },
        activeAnalysis: newAnalysisResult,
        processingStatus: "completed",
        error: null,
      });

      // Log refreshed For You recommendations
      try {
        const forYouItems = matchLearningRecommendations({
          targetPosition: newTargetPosition,
          skillGaps: newAnalysisResult.learningSnapshot?.skillGaps,
          skillsToLearn: newAnalysisResult.learningSnapshot?.skillsToLearn,
          detectedSkills: newAnalysisResult.learningSnapshot?.careerContext?.detectedSkills,
          missingSkills: newAnalysisResult.learningSnapshot?.careerContext?.missingSkills,
          learningSnapshot: newAnalysisResult.learningSnapshot,
          categoryId: "for_you",
          resourceType: "all",
        });
        if (forYouItems && forYouItems.length > 0) {
          logForYouRecommendations(
            currentUser.uid,
            newTargetPosition,
            newAnalysisResult.learningSnapshot?.skillGaps,
            forYouItems
          );
        }
      } catch (logErr) {
        // Quiet logging
      }

      console.log("============================================================");
      console.log("AIRIS — CAREER RETARGET COMPLETE");
      console.log("============================================================");
      console.log(`Target Role: ${newTargetPosition}`);
      console.log("Analysis: Created");
      console.log("For You: Refreshed");
      console.log("Status: SUCCESS");
      console.log("============================================================");
    } catch (err) {
      console.error("[AIRIS Retarget] Failed to retarget resume:", err);
      // Keep old activeAnalysis and activeResume completely intact on failure!
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
