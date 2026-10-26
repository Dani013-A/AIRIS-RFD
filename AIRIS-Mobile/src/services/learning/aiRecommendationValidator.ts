import { VERIFIED_LEARNING_CATALOG } from "../../data/verifiedLearningCatalog";
import { LearningResource } from "../../types/learning.types";
import { isValidUrl, validateLearningResource, canonicalResourceUrl } from "./catalogValidator";

export interface ValidationStageResult {
  passed: boolean;
  stageNumber: number;
  stageName: string;
  reason?: string;
}

export interface CandidateValidationReport {
  isValid: boolean;
  resource?: LearningResource;
  stageResults: ValidationStageResult[];
  rejectionReason?: string;
}

const DISALLOWED_DOMAINS = [
  "google.com/search",
  "bing.com/search",
  "yahoo.com/search",
  "duckduckgo.com",
  "example.com",
  "placeholder.com",
  "test.com",
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
];

const TRUSTED_DOMAINS = [
  "coursera.org",
  "edx.org",
  "cisco.com",
  "netacad.com",
  "comptia.org",
  "microsoft.com",
  "learn.microsoft.com",
  "amazon.com",
  "aws.amazon.com",
  "google.com",
  "cloud.google.com",
  "redhat.com",
  "linuxfoundation.org",
  "linuxjourney.com",
  "subnetting.net",
  "wireshark.org",
  "github.com",
  "freecodecamp.org",
  "kaggle.com",
  "w3schools.com",
  "developer.mozilla.org",
  "oracle.com",
  "pmi.org",
  "udacity.com",
  "pluralsight.com",
  "udemy.com",
  "codecademy.com",
  "datacamp.com",
  "cloudacademy.com",
  "mit.edu",
  "stanford.edu",
  "harvard.edu",
  "berkeley.edu",
];

/**
 * 13-Stage AI Recommendation Validation Pipeline.
 * Enforces strict provenance separation and verification before any AI candidate can surface to the user.
 */
export function validateAiRecommendationCandidate(
  candidate: Partial<LearningResource>,
  context: {
    targetGaps: Array<string | { skill?: string; name?: string }>;
    targetPosition: string;
    existingCatalog: LearningResource[];
    rawResumeText?: string;
  }
): CandidateValidationReport {
  const reviewed = VERIFIED_LEARNING_CATALOG.find(record =>
    canonicalResourceUrl(record.url) === canonicalResourceUrl(candidate.url || "") && validateLearningResource(record));
  if (reviewed) candidate = { ...reviewed };
  const stageResults: ValidationStageResult[] = [];

  const recordStage = (num: number, name: string, passed: boolean, reason?: string) => {
    stageResults.push({ stageNumber: num, stageName: name, passed, reason });
    return passed;
  };

  // Stage 1: URL Syntax & Protocol
  const rawUrl = (candidate.url || "").trim();
  if (!recordStage(1, "URL Syntax & Protocol", isValidUrl(rawUrl), "URL is empty or invalid format")) {
    return { isValid: false, stageResults, rejectionReason: "Invalid URL syntax or protocol" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    recordStage(1, "URL Syntax & Protocol", false, "URL failed parsing");
    return { isValid: false, stageResults, rejectionReason: "URL parsing exception" };
  }

  // Stage 2: Disallowed Domains & Search Queries
  const isDisallowed = DISALLOWED_DOMAINS.some(blocked => {
    const [domain, ...path] = blocked.split("/");
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    return (host === domain || host.endsWith(`.${domain}`)) && (!path.length || parsedUrl.pathname.startsWith(`/${path.join("/")}`));
  });
  if (!recordStage(2, "Disallowed Domains Check", !isDisallowed, "URL belongs to disallowed domain or search query")) {
    return { isValid: false, stageResults, rejectionReason: "Disallowed domain or search query fallback" };
  }

  // Stage 3: Trusted Domain Whitelist
  const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
  const isTrusted = !!reviewed || TRUSTED_DOMAINS.some((td) => host === td || host.endsWith("." + td));
  if (!recordStage(3, "Trusted Provider Whitelist", isTrusted, `Domain ${host} is not in trusted registry`)) {
    return { isValid: false, stageResults, rejectionReason: `Domain ${host} is not an authoritative provider` };
  }

  // Stage 4: URL Path Specificity (Reject Generic Root Landing Pages)
  const pathname = parsedUrl.pathname.trim();
  const isRootLanding = pathname === "" || pathname === "/" || pathname === "/en" || pathname === "/en-us";
  if (!recordStage(4, "Specific Resource Path", !isRootLanding, "URL points to generic domain landing page")) {
    return { isValid: false, stageResults, rejectionReason: "Generic provider landing page without specific course/cert path" };
  }

  // Stage 5: URL Canonicalization & Sanitization
  // Strip tracking query parameters
  const sanitizedUrl = new URL(rawUrl);
  const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "ref"];
  trackingParams.forEach((param) => sanitizedUrl.searchParams.delete(param));
  const canonicalUrl = sanitizedUrl.toString().replace(/\/$/, "");
  recordStage(5, "URL Canonicalization", true);

  // Stage 6: Title & Structural Completeness
  const title = (candidate.title || "").trim();
  const titleWords = title.split(/\s+/).filter(Boolean);
  const hasValidTitle = !!reviewed || (titleWords.length >= 3 && title.length >= 10);
  if (!recordStage(6, "Title Completeness", hasValidTitle, "Title is too short or non-descriptive")) {
    return { isValid: false, stageResults, rejectionReason: "Candidate title lacks technical specificity" };
  }

  // Stage 7: Description & Narrative Quality
  const description = (candidate.description || "").trim();
  const descWords = description.split(/\s+/).filter(Boolean);
  const hasValidDesc = descWords.length >= 8 && description.length >= 30;
  if (!recordStage(7, "Description Quality", hasValidDesc, "Description is missing or lacks sufficient context")) {
    return { isValid: false, stageResults, rejectionReason: "Candidate description lacks substantive details" };
  }

  // Stage 8: Provider Grounding
  const provider = (candidate.provider || "").trim();
  const hasProvider = provider.length >= 2;
  if (!recordStage(8, "Provider Grounding", hasProvider, "Provider is missing")) {
    return { isValid: false, stageResults, rejectionReason: "Missing provider attribution" };
  }

  // Stage 9: Resource Type Verification
  const validTypes = ["certification", "course", "practice", "guide", "documentation", "seminar", "video", "module", "example"];
  const isValidType = validTypes.includes(candidate.type as string);
  if (!recordStage(9, "Resource Type Verification", isValidType, `Invalid resource type ${candidate.type}`)) {
    return { isValid: false, stageResults, rejectionReason: "Invalid resource type specification" };
  }

  // Stage 10: Competency & Skill Gap Grounding (Gap-First Condition)
  const candidateSkills = (candidate.skills || [])
    .map((s: any) => (typeof s === "string" ? s.toLowerCase().trim() : String(s?.name || "").toLowerCase().trim()))
    .filter(Boolean);
  const candidateTitleLower = title.toLowerCase();
  const candidateDescLower = description.toLowerCase();
  const targetGapsLower = (context.targetGaps || [])
    .map((g: any) => {
      if (typeof g === "string") return g.toLowerCase().trim();
      if (g && typeof g.skill === "string") return g.skill.toLowerCase().trim();
      if (g && typeof g.name === "string") return g.name.toLowerCase().trim();
      return "";
    })
    .filter((g) => g.length > 0);
  const targetPosLower = (context.targetPosition || "").toLowerCase().trim();

  const matchesGap = targetGapsLower.some((gap) =>
    candidateSkills.some((s) => s.includes(gap) || gap.includes(s)) ||
    candidateTitleLower.includes(gap) ||
    candidateDescLower.includes(gap)
  );

  const matchesTargetRole = targetPosLower.length > 0 && (
    candidateTitleLower.includes(targetPosLower) ||
    (candidate.careerPaths || []).some((cp) => cp.toLowerCase().includes(targetPosLower) || targetPosLower.includes(cp.toLowerCase()))
  );

  const hasCompetencyGrounding = matchesGap || matchesTargetRole || targetGapsLower.length === 0;
  if (!recordStage(10, "Competency & Gap Grounding", hasCompetencyGrounding, "Candidate does not address validated target gaps")) {
    return { isValid: false, stageResults, rejectionReason: "Candidate is not grounded in candidate's validated skill gaps" };
  }

  // Stage 11: Deduplication against Static Verified Catalog
  const isDuplicateInCatalog = context.existingCatalog.some(
    (item) =>
      item.id === candidate.id ||
      item.url.toLowerCase().replace(/\/$/, "") === canonicalUrl.toLowerCase() ||
      (item.title.toLowerCase().trim() === title.toLowerCase() && item.provider.toLowerCase().trim() === provider.toLowerCase())
  );
  if (!recordStage(11, "Catalog Deduplication", !isDuplicateInCatalog, "Candidate duplicates existing curated catalog item")) {
    return { isValid: false, stageResults, rejectionReason: "Candidate duplicates an existing verified catalog resource" };
  }

  // Stage 12: Deduplication against Resume Evidence
  const resumeLower = (context.rawResumeText || "").toLowerCase();
  const credentialAlreadyPossessed = (candidate.credentialCode && resumeLower.includes(candidate.credentialCode.toLowerCase())) ||
    ((candidate.aliases || []).some((alias) => alias.length >= 4 && resumeLower.includes(alias.toLowerCase())));
  if (!recordStage(12, "Resume Deduplication", !credentialAlreadyPossessed, "Candidate already possesses credential on resume")) {
    return { isValid: false, stageResults, rejectionReason: "Candidate already demonstrates this credential on resume" };
  }

  if (!recordStage(13, "Reviewed catalog provenance", !!reviewed)) {
    return { isValid: false, stageResults, rejectionReason: "Resource requires catalog content review; HTTP reachability alone is insufficient." };
  }
  const verifiedResource: LearningResource = { ...reviewed! };

  return {
    isValid: true,
    resource: verifiedResource,
    stageResults,
  };
}

/**
 * Validates a batch of AI recommendation candidates and returns only those that strictly pass all 13 stages.
 */
export function filterAndVerifyAiCandidates(
  candidates: Array<Partial<LearningResource>>,
  context: {
    targetGaps: Array<string | { skill?: string; name?: string }>;
    targetPosition: string;
    existingCatalog: LearningResource[];
    rawResumeText?: string;
  }
): LearningResource[] {
  const verifiedList: LearningResource[] = [];
  const seenUrls = new Set<string>();

  for (const cand of candidates) {
    const report = validateAiRecommendationCandidate(cand, {
      ...context,
      existingCatalog: [...context.existingCatalog, ...verifiedList],
    });

    if (report.isValid && report.resource) {
      const normUrl = report.resource.url.toLowerCase();
      if (!seenUrls.has(normUrl)) {
        seenUrls.add(normUrl);
        verifiedList.push(report.resource);
      }
    }
  }

  return verifiedList;
}
