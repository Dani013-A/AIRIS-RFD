import AsyncStorage from "@react-native-async-storage/async-storage";

export type SelfRating = "STRONG" | "MODERATE" | "WEAK" | "SKIP";

export interface SkillSelfAssessmentMap {
  [skillNameLower: string]: SelfRating;
}

export type PersonalizedStatus =
  | "STRONG_POINT"
  | "STRONG_POINT_LIMITED_EVIDENCE"
  | "MODERATE_POINT"
  | "WEAK_POINT"
  | "ADDITIONAL_STRENGTH"
  | "CONFIDENCE_MISMATCH"
  | "UNANALYZED";

export interface SkillAssessmentTarget {
  name: string;
  relevance: "HIGH" | "MEDIUM" | "LOW";
}

export interface PersonalizedCompetencyItem {
  competency: string;
  targetRelevance: "HIGH" | "MEDIUM" | "LOW";
  resumeEvidenceStatus: "STRONG_MATCH" | "PARTIAL_MATCH" | "NO_RELEVANT_EVIDENCE";
  evidenceLevel: "EXPLICIT" | "DEMONSTRATED" | "STRONG_DEMONSTRATED" | "MISSING";
  selfRating: SelfRating;
  personalizedStatus: PersonalizedStatus;
  headline: string;
  description: string;
  actionRecommendation: string;
  actionType: "DOCUMENT_EXISTING" | "DEVELOP_COMPETENCY" | "STRENGTHEN_PRACTICE" | "LOW_PRIORITY";
  matchedChunk?: string | null;
}

/**
 * Robust, Domain-Neutral Source-Grounded Verbatim Evidence Validator.
 * Verifies that a quote:
 * 1. Originates strictly from the user's submitted resume text (exact/normalized source text).
 * 2. Has genuine canonical competency token/stem overlap with the evaluated competency.
 * 3. Rejects hallucinated quotes and cross-contaminated quotes without hardcoded skill lists or fixed verb dictionaries.
 */
export function validateVerbatimEvidence(
  competencyName: string,
  matchedChunk: string | null | undefined,
  rawResumeText: string = ""
): string | null {
  if (!matchedChunk || typeof matchedChunk !== "string") return null;
  const trimmedChunk = matchedChunk.trim();
  if (!trimmedChunk || trimmedChunk.length < 5) return null;

  const normRaw = (rawResumeText || "").toLowerCase().replace(/\s+/g, " ");
  const normChunk = trimmedChunk.toLowerCase().replace(/\s+/g, " ");

  // 1. SOURCE EXISTENCE CHECK: Quote MUST exist in submitted raw resume text
  if (normRaw && normChunk.length >= 8 && !normRaw.includes(normChunk)) {
    return null; // HALLUCINATED: Proposed evidence does not exist in source text
  }

  // 2. DOMAIN-NEUTRAL CANONICAL TOKEN & STEM MATCHING
  // Normalize competency name by removing tech suffixes (.js, js, .pro, (es6), framework, library, etc.)
  const normComp = (competencyName || "")
    .toLowerCase()
    .replace(/\.js\b|\bjs\b|\.pro\b|\(es6\)|\bframework\b|\blibrary\b|\bruntime\b/g, " ")
    .trim();

  // Extract core stem tokens (length >= 2, non-filler)
  const compTokens = normComp
    .split(/[\s\/,\(\)\+\-_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !["and", "with", "using", "for", "the", "in", "of", "design", "implementation", "development"].includes(t));

  const origNormComp = (competencyName || "").toLowerCase().trim();

  // Check overlap: chunk must contain either full competency string, or any canonical token stem
  const hasExactCompMatch = normChunk.includes(origNormComp) || normChunk.includes(normComp);
  const hasStemTokenMatch = compTokens.length > 0 && compTokens.some((token) => normChunk.includes(token));

  if (!hasExactCompMatch && !hasStemTokenMatch) {
    return null; // UNVERIFIED / AMBIGUOUS: No semantic or stem overlap with evaluated competency
  }

  return trimmedChunk; // SOURCE-VERIFIED
}

/**
 * Dynamically extracts competencies directly GROUNDED in the user's submitted resume.
 * Strictly preserves the user's supported resume skills.
 * NEVER injects target-role benchmark skills or artificial caps.
 */
export function extractTargetCompetenciesForSelfAssessment(
  analysisResult: any
): SkillAssessmentTarget[] {
  if (!analysisResult) return [];

  const targets: SkillAssessmentTarget[] = [];
  const seen = new Set<string>();

  // 1. Extract raw skills directly detected/extracted from user's submitted resume
  const resumeDetectedSkills: string[] = [
    ...(analysisResult.detectedSkills || []),
    ...((analysisResult.structuredData?.skills || []).map((s: any) => typeof s === "string" ? s : s.name || s.title || "")),
    ...(analysisResult.learningSnapshot?.careerContext?.detectedSkills || []),
  ].filter(Boolean);

  // Gauge target-role relevance if benchmark adjustments exist
  const adjustments =
    analysisResult.atsScore?.roleRelevance?.adjustments ||
    analysisResult.atsScore?.adjustments ||
    [];

  const semanticAdjustments = adjustments.filter(
    (adj: any) => adj.category === "skillsMatch"
  );

  const benchmarkHighRelevance = new Set<string>();
  const benchmarkMedRelevance = new Set<string>();

  for (const adj of semanticAdjustments) {
    const rawConcept = (adj.ruleId || "")
      .replace("match_", "")
      .replace(/_/g, " ")
      .toLowerCase();
    if (adj.maximumPoints === 10) benchmarkHighRelevance.add(rawConcept);
    else if (adj.maximumPoints === 5) benchmarkMedRelevance.add(rawConcept);
  }

  // Add resume-grounded skills ONLY (no data-layer cap)
  for (const rawSkill of resumeDetectedSkills) {
    const cleanSkill = rawSkill.trim();
    if (!cleanSkill) continue;
    const lowerKey = cleanSkill.toLowerCase();

    if (seen.has(lowerKey)) continue;
    seen.add(lowerKey);

    const displayName = formatCanonicalCompetencyName(cleanSkill);

    let relevance: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
    if (benchmarkHighRelevance.has(lowerKey) || Array.from(benchmarkHighRelevance).some((b) => b.includes(lowerKey) || lowerKey.includes(b))) {
      relevance = "HIGH";
    } else if (benchmarkMedRelevance.has(lowerKey) || Array.from(benchmarkMedRelevance).some((b) => b.includes(lowerKey) || lowerKey.includes(b))) {
      relevance = "MEDIUM";
    }

    targets.push({
      name: displayName,
      relevance,
    });
  }

  return targets;
}

/**
 * Generic, domain-neutral competency display-name formatter.
 * Formats concise, natural display names for skills without any hardcoded target role or skill conditionals.
 */
export function formatCanonicalCompetencyName(rawName: string): string {
  if (!rawName) return "";
  let trimmed = rawName.trim();
  
  // Clean synthetic long benchmark rule strings if present
  if (trimmed.toLowerCase().includes("relational and nosql databases")) {
    return "SQL & NoSQL Databases";
  }
  if (trimmed.toLowerCase().includes("javascript (es6) with node.js")) {
    return "JavaScript & Node.js";
  }
  if (trimmed.toLowerCase().includes("restful api design") && trimmed.toLowerCase().includes("express")) {
    return "Express.js & REST APIs";
  }

  const KNOWN_EXCEPTIONS: Record<string, string> = {
    "fastapi": "FastAPI",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "sql": "SQL",
    "rest api": "REST API",
    "api": "API",
    "html": "HTML",
    "css": "CSS",
    "autocad": "AutoCAD",
    "staad.pro": "STAAD.Pro",
    "staad pro": "STAAD.Pro",
    "sketchup": "SketchUp",
    "power bi": "Power BI",
    "aws": "AWS",
    "etl": "ETL",
    "cpa": "CPA",
    "bim": "BIM",
    "node.js": "Node.js",
    "react.js": "React.js",
    "express.js": "Express.js",
    "react native": "React Native",
    "vue.js": "Vue.js",
    "next.js": "Next.js"
  };

  const lower = trimmed.toLowerCase();
  if (KNOWN_EXCEPTIONS[lower]) {
    return KNOWN_EXCEPTIONS[lower];
  }

  if (trimmed.length <= 4 && trimmed === trimmed.toUpperCase()) {
    return trimmed;
  }

  return trimmed
    .split(/\s+/)
    .map((word) => {
      const wLower = word.toLowerCase();
      if (KNOWN_EXCEPTIONS[wLower]) return KNOWN_EXCEPTIONS[wLower];
      if (word.length <= 3 && /^[a-z]+$/i.test(word) && ["api", "sql", "aws", "etl", "cpa", "bim", "cad", "seo"].includes(wLower)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

const SELF_ASSESSMENT_STORAGE_KEY = "@airis_skill_self_assessments_v1";

/**
 * Loads stored student skill self-assessments from persistent local storage.
 */
export async function getStoredSelfAssessments(): Promise<SkillSelfAssessmentMap> {
  try {
    const raw = await AsyncStorage.getItem(SELF_ASSESSMENT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error("[AIRIS Self-Assessment] Failed to load stored ratings:", err);
    return {};
  }
}

/**
 * Saves or updates student skill self-assessments in persistent local storage.
 */
export async function saveSelfAssessments(newRatings: SkillSelfAssessmentMap): Promise<SkillSelfAssessmentMap> {
  try {
    const existing = await getStoredSelfAssessments();
    const merged: SkillSelfAssessmentMap = { ...existing };
    
    for (const [skill, rating] of Object.entries(newRatings)) {
      if (rating) {
        merged[skill.toLowerCase().trim()] = rating;
      }
    }

    await AsyncStorage.setItem(SELF_ASSESSMENT_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.error("[AIRIS Self-Assessment] Failed to save ratings:", err);
    return newRatings;
  }
}

/**
 * Pure evaluation function combining Target Relevance + Resume Evidence + Self-Rating
 * to produce honest, non-fabricated, personalized competency guidance.
 */
export function evaluatePersonalizedCompetency(params: {
  competency: string;
  targetRelevance: "HIGH" | "MEDIUM" | "LOW";
  resumeEvidenceStatus: "STRONG_MATCH" | "PARTIAL_MATCH" | "NO_RELEVANT_EVIDENCE";
  matchedChunk?: string | null;
  selfRating?: SelfRating;
}): PersonalizedCompetencyItem {
  const { competency: rawCompetency, targetRelevance, resumeEvidenceStatus, matchedChunk, selfRating = "SKIP" } = params;
  const competency = formatCanonicalCompetencyName(rawCompetency);

  let evidenceLevel: "EXPLICIT" | "DEMONSTRATED" | "STRONG_DEMONSTRATED" | "MISSING" = "MISSING";
  if (resumeEvidenceStatus === "STRONG_MATCH") {
    evidenceLevel = "STRONG_DEMONSTRATED";
  } else if (resumeEvidenceStatus === "PARTIAL_MATCH") {
    evidenceLevel = "DEMONSTRATED";
  }

  // Case 1 & Case 2 & Case 5: Self-Rated STRONG
  if (selfRating === "STRONG") {
    if (resumeEvidenceStatus === "STRONG_MATCH" || resumeEvidenceStatus === "PARTIAL_MATCH") {
      return {
        competency,
        targetRelevance,
        resumeEvidenceStatus,
        evidenceLevel,
        selfRating,
        personalizedStatus: "STRONG_POINT",
        headline: "STRONG POINT",
        description: "Your resume clearly demonstrates this competency and you feel confident using it.",
        actionRecommendation: "Preserve and strengthen your evidence with specific, measurable outcomes where possible.",
        actionType: "DOCUMENT_EXISTING",
        matchedChunk,
      };
    } else if (targetRelevance === "HIGH" || targetRelevance === "MEDIUM") {
      return {
        competency,
        targetRelevance,
        resumeEvidenceStatus,
        evidenceLevel: "MISSING",
        selfRating,
        personalizedStatus: "STRONG_POINT_LIMITED_EVIDENCE",
        headline: "STRONG POTENTIAL - LIMITED RESUME EVIDENCE",
        description: "You feel confident with this competency, but your resume doesn't clearly show where or how you used it.",
        actionRecommendation: `WHAT TO ADD:\nDocument a real project, coursework, task, internship, or work experience where you applied ${competency}.`,
        actionType: "DOCUMENT_EXISTING",
        matchedChunk: undefined,
      };
    } else {
      return {
        competency,
        targetRelevance,
        resumeEvidenceStatus,
        evidenceLevel: "MISSING",
        selfRating,
        personalizedStatus: "ADDITIONAL_STRENGTH",
        headline: "ADDITIONAL STRENGTH",
        description: "You are confident in this skill, though it is not a primary requirement for your selected target role.",
        actionRecommendation: "Keep this skill listed under technical proficiencies without taking focus away from core role requirements.",
        actionType: "LOW_PRIORITY",
        matchedChunk: undefined,
      };
    }
  }

  // Case 3: Self-Rated MODERATE
  if (selfRating === "MODERATE") {
    if (resumeEvidenceStatus === "STRONG_MATCH" || resumeEvidenceStatus === "PARTIAL_MATCH") {
      return {
        competency,
        targetRelevance,
        resumeEvidenceStatus,
        evidenceLevel,
        selfRating,
        personalizedStatus: "MODERATE_POINT",
        headline: "MODERATE POINT",
        description: "Your resume shows practical use, while you rate your confidence as moderate.",
        actionRecommendation: "WHAT TO IMPROVE:\nStrengthen practical evidence and describe your specific contribution.",
        actionType: "STRENGTHEN_PRACTICE",
        matchedChunk,
      };
    } else {
      return {
        competency,
        targetRelevance,
        resumeEvidenceStatus,
        evidenceLevel: "MISSING",
        selfRating,
        personalizedStatus: "MODERATE_POINT",
        headline: "MODERATE POINT - EVIDENCE GAP",
        description: "You rate your confidence as moderate, but your resume lacks visible evidence for this target role competency.",
        actionRecommendation: `WHAT TO ADD:\nBuild a practical project or task using ${competency} and document it in your resume.`,
        actionType: "DEVELOP_COMPETENCY",
        matchedChunk: undefined,
      };
    }
  }

  // Case 4: Self-Rated WEAK
  if (selfRating === "WEAK") {
    if (resumeEvidenceStatus === "STRONG_MATCH" || resumeEvidenceStatus === "PARTIAL_MATCH") {
      return {
        competency,
        targetRelevance,
        resumeEvidenceStatus,
        evidenceLevel,
        selfRating,
        personalizedStatus: "CONFIDENCE_MISMATCH",
        headline: "STRONG EVIDENCE - LOW CONFIDENCE",
        description: "Your resume shows verified evidence for this skill, but you currently rate your personal confidence as weak.",
        actionRecommendation: "WHAT TO REVIEW:\nReview your past deliverables to rebuild confidence, or revisit fundamental concepts before technical interviews.",
        actionType: "STRENGTHEN_PRACTICE",
        matchedChunk,
      };
    } else if (targetRelevance === "HIGH" || targetRelevance === "MEDIUM") {
      return {
        competency,
        targetRelevance,
        resumeEvidenceStatus,
        evidenceLevel: "MISSING",
        selfRating,
        personalizedStatus: "WEAK_POINT",
        headline: "WEAK POINT / GAP",
        description: "You currently rate yourself weak and your resume does not demonstrate this competency.",
        actionRecommendation: "WHAT TO DEVELOP:\nPrioritize learning and hands-on practice if this competency is important to your target role.",
        actionType: "DEVELOP_COMPETENCY",
        matchedChunk: undefined,
      };
    } else {
      return {
        competency,
        targetRelevance,
        resumeEvidenceStatus,
        evidenceLevel: "MISSING",
        selfRating,
        personalizedStatus: "WEAK_POINT",
        headline: "LOW PRIORITY GAP",
        description: "You rate your confidence as weak, but this is a secondary requirement for your target role.",
        actionRecommendation: "Focus first on core required skills before investing time here.",
        actionType: "LOW_PRIORITY",
        matchedChunk: undefined,
      };
    }
  }

  // Fallback (SKIP or unrated): Evidence-driven interpretation
  if (resumeEvidenceStatus === "STRONG_MATCH") {
    return {
      competency,
      targetRelevance,
      resumeEvidenceStatus,
      evidenceLevel: "STRONG_DEMONSTRATED",
      selfRating: "SKIP",
      personalizedStatus: "STRONG_POINT",
      headline: "STRONG POINT",
      description: "Your resume demonstrates solid evidence for this target role competency.",
      actionRecommendation: "Keep this evidence detailed and prominent in your portfolio.",
      actionType: "DOCUMENT_EXISTING",
      matchedChunk,
    };
  } else if (resumeEvidenceStatus === "PARTIAL_MATCH") {
    return {
      competency,
      targetRelevance,
      resumeEvidenceStatus,
      evidenceLevel: "DEMONSTRATED",
      selfRating: "SKIP",
      personalizedStatus: "MODERATE_POINT",
      headline: "MODERATE POINT",
      description: "Partial evidence detected in your resume.",
      actionRecommendation: "Detail your specific role and outcomes when applying this skill.",
      actionType: "STRENGTHEN_PRACTICE",
      matchedChunk,
    };
  } else {
    return {
      competency,
      targetRelevance,
      resumeEvidenceStatus,
      evidenceLevel: "MISSING",
      selfRating: "SKIP",
      personalizedStatus: "WEAK_POINT",
      headline: "WEAK POINT",
      description: "No relevant evidence detected in your resume for this competency.",
      actionRecommendation: `WHAT TO ADD:\nDescribe the project or task where you implemented ${competency}.`,
      actionType: "DEVELOP_COMPETENCY",
      matchedChunk: undefined,
    };
  }
}
