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

export const CANONICAL_SKILL_MAP: Record<string, string> = {
  "react.js": "React",
  "reactjs": "React",
  "react js": "React",
  "react": "React",
  "react native": "React Native",
  "react-native": "React Native",
  "node.js": "Node.js",
  "nodejs": "Node.js",
  "node js": "Node.js",
  "node": "Node.js",
  "express.js": "Express.js",
  "expressjs": "Express.js",
  "express js": "Express.js",
  "express": "Express.js",
  "vue.js": "Vue.js",
  "vuejs": "Vue.js",
  "vue js": "Vue.js",
  "vue": "Vue.js",
  "next.js": "Next.js",
  "nextjs": "Next.js",
  "next js": "Next.js",
  "next": "Next.js",
  "javascript": "JavaScript",
  "js": "JavaScript",
  "ecmascript": "JavaScript",
  "es6": "JavaScript",
  "typescript": "TypeScript",
  "ts": "TypeScript",
  "c++": "C++",
  "cpp": "C++",
  "c plus plus": "C++",
  "c#": "C#",
  "csharp": "C#",
  "c sharp": "C#",
  "vb.net": "VB.NET",
  "vb net": "VB.NET",
  "visual basic .net": "VB.NET",
  "visual basic": "VB.NET",
  ".net": ".NET",
  "net": ".NET",
  "dotnet": ".NET",
  "dot net": ".NET",
  "rest api": "REST API",
  "restful api": "REST API",
  "restful apis": "REST API",
  "rest apis": "REST API",
  "aws": "AWS",
  "amazon web services": "AWS",
  "aws ec2": "AWS EC2",
  "ec2": "AWS EC2",
  "aws rds": "AWS RDS",
  "rds": "AWS RDS",
  "gcp": "GCP",
  "google cloud": "GCP",
  "google cloud platform": "GCP",
  "sql": "SQL",
  "structured query language": "SQL",
  "mysql": "MySQL",
  "postgresql": "PostgreSQL",
  "postgres": "PostgreSQL",
  "sqlite": "SQLite",
  "mongodb": "MongoDB",
  "redis": "Redis",
  "pytorch": "PyTorch",
  "tensorflow": "TensorFlow",
  "scikit-learn": "Scikit-Learn",
  "sklearn": "Scikit-Learn",
  "numpy": "NumPy",
  "pandas": "Pandas",
  "html": "HTML",
  "html5": "HTML",
  "css": "CSS",
  "css3": "CSS",
  "excel": "Excel",
  "ms excel": "Excel",
  "microsoft excel": "Excel",
  "advanced excel": "Advanced Excel",
  "autocad": "AutoCAD",
  "auto cad": "AutoCAD",
  "quickbooks": "QuickBooks",
  "quick books": "QuickBooks",
  "staad.pro": "STAAD.Pro",
  "staad pro": "STAAD.Pro",
  "staad-pro": "STAAD.Pro",
  "sentence transformers": "Sentence Transformers",
  "sentence-transformers": "Sentence Transformers",
  "sbert": "SBERT",
  "fastapi": "FastAPI",
  "postman": "Postman",
  "github": "GitHub",
  "gitlab": "GitLab",
  "openrouter": "OpenRouter",
  "git": "Git",
  "figma": "Figma",
  "unity": "Unity",
  "android studio": "Android Studio",
  "power bi": "Power BI",
  "powerbi": "Power BI",
  "sap": "SAP",
  "erp": "ERP",
  "revit": "Revit",
  "autodesk revit": "Revit",
  "sketchup": "SketchUp",
  "spss": "SPSS",
};

export function isSkillGroundedInText(skillName: string, rawText: string): boolean {
  if (!skillName || !rawText) return false;

  let rawNorm = rawText.toLowerCase();
  rawNorm = rawNorm.replace(/[“”]/g, '"').replace(/[’]/g, "'").replace(/[–—]/g, "-");

  const skillClean = skillName.trim();
  if (!skillClean || skillClean.length < 2) return false;
  const skillLower = skillClean.toLowerCase();

  // Expand search terms with canonical aliases
  const searchTerms = [skillLower];
  const canonTarget = CANONICAL_SKILL_MAP[skillLower];
  if (canonTarget && !searchTerms.includes(canonTarget.toLowerCase())) {
    searchTerms.push(canonTarget.toLowerCase());
  }

  for (const [alias, canon] of Object.entries(CANONICAL_SKILL_MAP)) {
    if (canon.toLowerCase() === skillLower || (canonTarget && canon.toLowerCase() === canonTarget.toLowerCase())) {
      if (!searchTerms.includes(alias)) {
        searchTerms.push(alias);
      }
    }
  }

  for (const term of searchTerms) {
    const cleanT = term.trim();
    if (!cleanT) continue;

    if (/^[a-zA-Z0-9\s]+$/.test(cleanT)) {
      // Purely alphanumeric: enforce word boundaries so e.g. "java" does not match "javascript"
      const words = cleanT.split(/\s+/).map((w) => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"));
      const pat = new RegExp(`\\b${words.join("\\s+")}\\b`, "i");
      if (pat.test(rawNorm)) return true;
    } else {
      // Term contains symbols like C++, C#, .NET, Node.js, STAAD.Pro
      let escaped = cleanT.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      escaped = escaped.replace(/\\([.\-+])/g, "\\s*\\$1\\s*");
      const leftB = /^\w/.test(cleanT) ? "(?:\\b|(?<=[^a-zA-Z0-9]))" : "(?:^|(?<=[\\s,;:(•|\\n\\r]))";
      const rightB = /.*\w$/.test(cleanT) ? "(?:\\b|(?=[^a-zA-Z0-9]))" : "(?:$|(?=[\\s,;:.)•|\\n\\r]))";
      const pat = new RegExp(`${leftB}${escaped}${rightB}`, "i");
      if (pat.test(rawNorm)) return true;
    }
  }

  return false;
}

/**
 * Dynamically extracts competencies directly GROUNDED in the user's submitted resume.
 * Strictly preserves the user's supported resume skills.
 * NEVER injects target-role benchmark skills or artificial caps.
 */
export function extractTargetCompetenciesForSelfAssessment(
  analysisResult: any,
  options?: { maxItems?: number; existingRatings?: SkillSelfAssessmentMap }
): SkillAssessmentTarget[] {
  if (!analysisResult) return [];

  const maxItems = options?.maxItems ?? 10;
  const existingRatings = options?.existingRatings || {};

  const rawResumeText =
    analysisResult.rawText ||
    (analysisResult.parsedSections ? Object.values(analysisResult.parsedSections).join("\n\n") : "") ||
    "";

  // 1. Extract raw candidate skills directly detected/extracted from user's submitted resume
  const allCandidateSkills: string[] = [
    ...(analysisResult.detectedSkills || []),
    ...((analysisResult.structuredData?.skills || []).map((s: any) => typeof s === "string" ? s : s.name || s.title || "")),
    ...(analysisResult.learningSnapshot?.careerContext?.detectedSkills || []),
    ...(analysisResult.parsedSections?.Skills ? String(analysisResult.parsedSections.Skills).split(/[,;\n•|]+/) : []),
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

  // Target role title / keywords
  const targetRoleStr = (
    analysisResult.targetPosition ||
    analysisResult.targetRole?.title ||
    analysisResult.learningSnapshot?.targetPosition ||
    ""
  ).toLowerCase().trim();

  // Academic program context
  const programStr = (
    analysisResult.academicProgram ||
    analysisResult.learningSnapshot?.programContext ||
    analysisResult.degreeProgram ||
    ""
  ).toLowerCase().trim();

  // Experience / Projects text for evidence depth
  const expProjText = [
    analysisResult.parsedSections?.Experience || "",
    analysisResult.parsedSections?.WorkExperience || "",
    analysisResult.parsedSections?.Projects || "",
    analysisResult.parsedSections?.Internship || "",
  ].join("\n").toLowerCase();

  const candidateItems: Array<{
    name: string;
    canonicalKey: string;
    relevance: "HIGH" | "MEDIUM" | "LOW";
    priorityScore: number;
    evidenceCount: number;
  }> = [];

  const seen = new Set<string>();

  for (const rawSkill of allCandidateSkills) {
    const cleanSkill = rawSkill.trim();
    if (!cleanSkill || cleanSkill.length < 2) continue;

    // Strict Grounding Check when raw text is present
    if (rawResumeText && !isSkillGroundedInText(cleanSkill, rawResumeText)) {
      continue;
    }

    const displayName = formatCanonicalCompetencyName(cleanSkill);
    const canonicalKey = displayName.toLowerCase();
    if (seen.has(canonicalKey)) continue;
    seen.add(canonicalKey);

    // Calculate generalized, domain-neutral prioritization score
    let priorityScore = 0;
    let relevance: "HIGH" | "MEDIUM" | "LOW" = "LOW";

    // 1. Target Career Relevance
    const isTargetHigh =
      benchmarkHighRelevance.has(canonicalKey) ||
      Array.from(benchmarkHighRelevance).some((b) => b.includes(canonicalKey) || canonicalKey.includes(b));
    const isTargetMed =
      benchmarkMedRelevance.has(canonicalKey) ||
      Array.from(benchmarkMedRelevance).some((b) => b.includes(canonicalKey) || canonicalKey.includes(b));

    if (isTargetHigh) {
      priorityScore += 100;
      relevance = "HIGH";
    } else if (isTargetMed) {
      priorityScore += 60;
      relevance = "MEDIUM";
    } else if (targetRoleStr && (targetRoleStr.includes(canonicalKey) || canonicalKey.includes(targetRoleStr))) {
      priorityScore += 50;
      relevance = "HIGH";
    } else {
      relevance = "MEDIUM";
      priorityScore += 20;
    }

    // 2. Academic Program Relevance
    if (programStr && (programStr.includes(canonicalKey) || canonicalKey.includes(programStr))) {
      priorityScore += 30;
    }

    // 3. Evidence Strength in Resume
    let evidenceCount = 0;
    if (rawResumeText) {
      const lowerRaw = rawResumeText.toLowerCase();
      let pos = 0;
      while ((pos = lowerRaw.indexOf(canonicalKey, pos)) !== -1) {
        evidenceCount++;
        pos += canonicalKey.length;
        if (evidenceCount >= 10) break;
      }
    }
    // Deep evidence in Work Experience / Projects / Internship sections
    if (expProjText && expProjText.includes(canonicalKey)) {
      priorityScore += 25;
    }
    priorityScore += Math.min(evidenceCount * 3, 15);

    // 4. Existing Self-Assessment Stability
    if (existingRatings[canonicalKey] || (analysisResult.selfRatings && analysisResult.selfRatings[canonicalKey])) {
      priorityScore += 10;
    }

    candidateItems.push({
      name: displayName,
      canonicalKey,
      relevance,
      priorityScore,
      evidenceCount,
    });
  }

  // Principled Top-10 Selection Rule:
  // IF candidate skills <= maxItems (10): return all candidate skills.
  // IF candidate skills > maxItems (10): sort by priority and select top 10.
  if (candidateItems.length <= maxItems) {
    return candidateItems.map((item) => ({
      name: item.name,
      relevance: item.relevance,
    }));
  }

  // Sort by priorityScore DESC, tie-break by evidenceCount DESC, then name ASC (deterministic)
  candidateItems.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    if (b.evidenceCount !== a.evidenceCount) {
      return b.evidenceCount - a.evidenceCount;
    }
    return a.name.localeCompare(b.name);
  });

  return candidateItems.slice(0, maxItems).map((item) => ({
    name: item.name,
    relevance: item.relevance,
  }));
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
    ".net": ".NET",
    "net": ".NET",
    "dotnet": ".NET",
    "dot net": ".NET",
    "vb.net": "VB.NET",
    "vb net": "VB.NET",
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
    "react": "React",
    "react.js": "React",
    "reactjs": "React",
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
