import { create } from "zustand";
import type { Resume, ResumeExtractionMethod, ResumeSourceFileType, ResumeProcessingStatus } from "../types/resume.types";
import type { ResumeAnalysisResult } from "../services/resume/resumeAnalysisEngine";
import { parseResumeSections, detectResumeSections } from "../services/resume/resumeAnalysisEngine";
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

import {
  extractTargetCompetenciesForSelfAssessment,
  getStoredSelfAssessments,
  saveSelfAssessments,
  type SkillAssessmentTarget,
  type SkillSelfAssessmentMap,
} from "../services/resume/selfAssessmentService";

interface ResumeState {
  activeResume: Resume | null;
  activeAnalysis: ResumeAnalysisResult | null;
  processingStatus: ResumeProcessingStatus;
  currentAnalysisSessionId: string | null;
  pendingTargetSkills: SkillAssessmentTarget[];
  pendingAnalysisData: any | null;
  finalizedSessionIds: Set<string>;
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
  completeSelfAssessmentAndFinalize: (ratings: SkillSelfAssessmentMap) => Promise<void>;
  refreshPersonalizedGuidance: (newRatings: SkillSelfAssessmentMap) => Promise<void>;
  setProcessingStatus: (status: ResumeProcessingStatus) => void;
  clearAnalysisState: () => void;
  clearStore: () => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  activeResume: null,
  activeAnalysis: null,
  processingStatus: "idle",
  currentAnalysisSessionId: null,
  pendingTargetSkills: [],
  pendingAnalysisData: null,
  finalizedSessionIds: new Set<string>(),
  error: null,

  fetchActiveResume: async (userId, activeResumeId) => {
    if (!activeResumeId) {
      set({ activeResume: null, activeAnalysis: null, error: null, processingStatus: "idle" });
      return;
    }

    // Protection Guard: Do not overwrite pending analysis awaiting self-assessment
    if (get().pendingAnalysisData !== null || get().processingStatus === "awaiting_self_assessment") {
      console.log(`[SESSION] fetchActiveResume ignored: session ${get().currentAnalysisSessionId} is pending self-assessment.`);
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
          if (analysisResult) {
            if (!analysisResult.scoringModelVersion && (analysisDoc as any).scoringModelVersion) {
              analysisResult.scoringModelVersion = (analysisDoc as any).scoringModelVersion;
            }
            if (!analysisResult.detectedSections || analysisResult.detectedSections.length === 0) {
              const parsed = parseResumeSections(resume.rawText || "");
              analysisResult.detectedSections = detectResumeSections(parsed);
            }
          }
        }
      }

      set({
        activeResume: resume,
        activeAnalysis: analysisResult,
        currentAnalysisSessionId: analysisResult?.analysisSessionId || (resume.latestAnalysisId ? `session_${resume.latestAnalysisId}` : null),
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
    // Generate a fresh analysisSessionId at the very beginning of upload
    const sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    console.log(`[UPLOAD] session=${sessionId} start`);

    // Immediately isolate the new session by clearing stale pending state from previous uploads
    set({
      currentAnalysisSessionId: sessionId,
      pendingAnalysisData: null,
      pendingTargetSkills: [],
      processingStatus: "validating",
      error: null,
    });

    try {
      const normalized = normalizeResumeText(rawText);
      validateResumeText(normalized);

      if (get().currentAnalysisSessionId !== sessionId) return;

      set({ processingStatus: "parsing" });
      const structuredData = parseAndBuildStructuredData(normalized);

      if (get().currentAnalysisSessionId !== sessionId) return;

      set({ processingStatus: "analyzing" });
      const analysisResult = precomputedAnalysis || (await calculateAtsCompatibility(normalized, targetPosition));

      if (get().currentAnalysisSessionId !== sessionId) return;

      console.log(`[ANALYSIS] session=${sessionId} ready`);

      if (!analysisResult.detectedSections || analysisResult.detectedSections.length === 0) {
        const parsed = parseResumeSections(normalized);
        analysisResult.detectedSections = detectResumeSections(parsed);
      }

      analysisResult.analysisSessionId = sessionId;

      // Extract target skills for self-assessment dynamically from candidate skills and target benchmark
      const targetSkills = extractTargetCompetenciesForSelfAssessment(analysisResult);

      const pendingData = {
        type: "upload",
        sessionId,
        userId,
        targetPosition,
        file,
        sourceFileType,
        extractionMethod,
        normalized,
        structuredData,
        analysisResult,
      };

      if (get().currentAnalysisSessionId !== sessionId) return;

      console.log(`[SESSION] session=${sessionId} pending`);
      console.log(`[SELF_ASSESSMENT] session=${sessionId} required`);

      // Invariant: EVERY successful new analysis MUST enter self-assessment before publication.
      set({
        pendingAnalysisData: pendingData,
        pendingTargetSkills: targetSkills,
        currentAnalysisSessionId: sessionId,
        processingStatus: "awaiting_self_assessment",
        error: null,
      });
    } catch (err) {
      if (get().currentAnalysisSessionId !== sessionId) return;
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

    const sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    // Immediately isolate the retarget session by clearing stale pending state
    set({
      currentAnalysisSessionId: sessionId,
      pendingAnalysisData: null,
      pendingTargetSkills: [],
      processingStatus: "analyzing",
      error: null,
    });

    try {
      const newAnalysisResult = await calculateAtsCompatibility(activeResume.rawText, newTargetPosition);

      if (get().currentAnalysisSessionId !== sessionId) return;

      newAnalysisResult.analysisSessionId = sessionId;

      const targetSkills = extractTargetCompetenciesForSelfAssessment(newAnalysisResult);

      const pendingData = {
        type: "retarget",
        sessionId,
        userId: currentUser.uid,
        newTargetPosition,
        activeResume,
        analysisResult: newAnalysisResult,
      };

      set({
        pendingAnalysisData: pendingData,
        pendingTargetSkills: targetSkills,
        currentAnalysisSessionId: sessionId,
        processingStatus: "awaiting_self_assessment",
        error: null,
      });
    } catch (err) {
      if (get().currentAnalysisSessionId !== sessionId) return;
      console.error("[AIRIS Retarget] Failed to retarget resume:", err);
      set({
        processingStatus: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  completeSelfAssessmentAndFinalize: async (ratings: SkillSelfAssessmentMap) => {
    const { pendingAnalysisData, finalizedSessionIds, processingStatus, currentAnalysisSessionId } = get();
    if (!pendingAnalysisData) {
      set({ processingStatus: "completed" });
      return;
    }

    const { sessionId } = pendingAnalysisData;

    // Session Guard: ensure old asynchronous tasks cannot finalize over a newer session
    if (currentAnalysisSessionId !== sessionId) {
      console.log(`[AIRIS Store] Aborting finalization: session ${sessionId} does not match current session ${currentAnalysisSessionId}`);
      return;
    }

    // Idempotency Check
    if (finalizedSessionIds.has(sessionId) || processingStatus === "finalizing") {
      console.log(`[AIRIS Store] Finalization already in progress or completed for session: ${sessionId}`);
      return;
    }

    try {
      set({ processingStatus: "finalizing" });

      // Save student self-ratings to persistent storage
      await saveSelfAssessments(ratings);

      const { type } = pendingAnalysisData;

      if (type === "retarget") {
        const { userId, newTargetPosition, activeResume, analysisResult } = pendingAnalysisData;
        const { analysisId } = await saveRetargetedAnalysisTransaction(
          userId,
          activeResume.resumeId,
          newTargetPosition,
          analysisResult
        );

        await saveUserActivity(userId, analysisId, {
          title: `Re-targeted resume for ${newTargetPosition}`,
          type: "Resume Analysis",
          score: analysisResult.resumeScore?.overallScore ?? analysisResult.atsScore.overallScore,
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

        await saveResumeLocally(
          userId,
          activeResume.resumeVersion,
          "",
          activeResume.originalFileName,
          activeResume.fileType,
          activeResume.rawText,
          activeResume.resumeId,
          analysisResult.resumeScore?.overallScore ?? analysisResult.atsScore.overallScore,
          analysisResult.atsScore.overallScore,
          analysisResult.alignmentScore?.overallScore ?? (analysisResult.atsScore.breakdown?.resumeQualityScore ?? 0)
        );

        const newFinalized = new Set(get().finalizedSessionIds);
        newFinalized.add(sessionId);

        set({
          activeResume: {
            ...activeResume,
            latestAnalysisId: analysisId,
          },
          activeAnalysis: analysisResult,
          currentAnalysisSessionId: sessionId,
          pendingAnalysisData: null,
          pendingTargetSkills: [],
          finalizedSessionIds: newFinalized,
          processingStatus: "completed",
          error: null,
        });

        try {
          const forYouItems = matchLearningRecommendations({
            targetPosition: newTargetPosition,
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
              newTargetPosition,
              analysisResult.learningSnapshot?.skillGaps,
              forYouItems
            );
          }
        } catch (logErr) {
          // Quiet logging
        }
      } else {
        const {
          userId,
          targetPosition,
          file,
          sourceFileType,
          extractionMethod,
          normalized,
          structuredData,
          analysisResult,
        } = pendingAnalysisData;

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
          score: analysisResult.resumeScore?.overallScore ?? analysisResult.atsScore.overallScore,
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

        await saveResumeLocally(
          userId,
          resume.resumeVersion,
          file.uri || "",
          file.name,
          file.mimeType || "application/octet-stream",
          normalized,
          resume.resumeId,
          analysisResult.resumeScore?.overallScore ?? analysisResult.atsScore.overallScore,
          analysisResult.atsScore.overallScore,
          analysisResult.alignmentScore?.overallScore ?? (analysisResult.atsScore.breakdown?.resumeQualityScore ?? 0)
        );

        const newFinalized = new Set(get().finalizedSessionIds);
        newFinalized.add(sessionId);

        console.log(`[SELF_ASSESSMENT] session=${sessionId} saved`);
        console.log(`[SESSION] session=${sessionId} published`);

        set({
          activeResume: resume,
          activeAnalysis: analysisResult,
          currentAnalysisSessionId: sessionId,
          pendingAnalysisData: null,
          pendingTargetSkills: [],
          finalizedSessionIds: newFinalized,
          processingStatus: "completed",
          error: null,
        });

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
      }
    } catch (err) {
      set({
        processingStatus: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  refreshPersonalizedGuidance: async (newRatings: SkillSelfAssessmentMap) => {
    const { activeAnalysis } = get();
    if (!activeAnalysis) return;

    try {
      // Persist new ratings to AsyncStorage
      await saveSelfAssessments(newRatings);

      // REQUIREMENT 2: Zero SBERT calls, zero LLM calls, zero ATS score changes, zero DB duplicates!
      set({
        activeAnalysis: {
          ...activeAnalysis,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("[AIRIS Store] Failed to refresh personalized guidance:", err);
    }
  },

  setProcessingStatus: (status) => set({ processingStatus: status }),

  clearAnalysisState: () => set({
    activeResume: null,
    activeAnalysis: null,
    pendingAnalysisData: null,
    pendingTargetSkills: [],
    currentAnalysisSessionId: null,
    processingStatus: "idle",
    error: null
  }),

  clearStore: () => set({
    activeResume: null,
    activeAnalysis: null,
    pendingAnalysisData: null,
    pendingTargetSkills: [],
    currentAnalysisSessionId: null,
    processingStatus: "idle",
    error: null
  }),
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
