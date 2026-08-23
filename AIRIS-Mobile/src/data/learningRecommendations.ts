import { ResumeAnalysisResult } from "../services/resume/resumeAnalysisEngine";
import { matchLearningRecommendations } from "../services/learning/learningCatalogService";

export interface LearningRecommendation {
  title: string;
  provider: string;
  description: string;
  type: "certification" | "seminar" | "course" | "documentation" | "learning-path";
  url: string;
  isAiSuggestedGap?: boolean;
  gapRationale?: string;
  thumbnailUrl?: string;
}

/**
 * Returns a list of verified learning recommendations for the student's program and target job.
 * Driven entirely by normalized metadata from the verified catalog.
 */
export function getLearningRecommendations(program: string, job: string): LearningRecommendation[] {
  const matched = matchLearningRecommendations({
    targetPosition: job,
    degreeProgram: program,
  });

  return matched.map((item) => ({
    title: item.title,
    provider: item.provider,
    description: item.description,
    type: item.type as any,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    isAiSuggestedGap: item.isPersonalizedGap,
    gapRationale: item.recommendationReason,
  }));
}

/**
 * Dynamically generates growth recommendations based on the AI analysis of the student's resume.
 * Utilizes the unified, verified learning catalog matching engine.
 */
export function getAiRecommendationsForResume(
  activeAnalysis: ResumeAnalysisResult | null,
  program: string,
  job: string
): LearningRecommendation[] {
  const learningSnap = activeAnalysis?.learningSnapshot;

  const matched = matchLearningRecommendations({
    targetPosition: job,
    degreeProgram: program,
    skillGaps: learningSnap?.skillGaps,
    skillsToLearn: learningSnap?.skillsToLearn,
    detectedSkills: learningSnap?.careerContext?.detectedSkills,
    missingSkills: learningSnap?.careerContext?.missingSkills,
    learningSnapshot: learningSnap,
  });

  return matched.map((item) => ({
    title: item.title,
    provider: item.provider,
    description: item.description,
    type: item.type as any,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    isAiSuggestedGap: item.isPersonalizedGap,
    gapRationale: item.recommendationReason,
  }));
}
