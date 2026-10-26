import { LearningResource, LearningCategory } from "../../types/learning.types";

/**
 * Catalog Validator Utility.
 * Validates resources and categories before persistence or presentation.
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && !url.username && !url.password
      && url.hostname.includes(".") && !/^(?:\d+\.){3}\d+$/.test(url.hostname)
      && !url.hostname.endsWith(".local") && !url.hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

export function isSeminarExpired(resource: LearningResource): boolean {
  if (resource.type !== "seminar" || !resource.seminarMetadata?.expiresAt) {
    return false;
  }
  const expiryTime = new Date(resource.seminarMetadata.expiresAt).getTime();
  if (isNaN(expiryTime)) return false;
  return Date.now() > expiryTime;
}

export function validateLearningResource(resource: Partial<LearningResource>): boolean {
  if (!resource || typeof resource !== "object") return false;
  if (!resource.id || !resource.title || !resource.provider || !resource.url) {
    return false;
  }
  if (!isValidUrl(resource.url)) {
    return false;
  }
  if (!["course", "certification", "seminar", "guide", "documentation", "practice", "video", "article", "example", "module"].includes(resource.type || "")) return false;
  // Require active and verified flags
  if (resource.isActive !== true || resource.isVerified !== true) {
    return false;
  }
  const verification = resource.verification;
  const checkedAt = Date.parse(verification?.checkedAt || "");
  const age = Date.now() - checkedAt;
  if (verification?.status !== "verified" || verification.contentReviewed !== true
    || verification.reviewedTitle !== resource.title || verification.reviewedProvider !== resource.provider
    || !verification.sourceUrl || canonicalResourceUrl(verification.sourceUrl) !== canonicalResourceUrl(resource.url)
    || !Number.isFinite(checkedAt) || age < -86400000 || age > 90 * 86400000
    || (resource.verificationStatus && resource.verificationStatus !== "verified")) return false;
  // Reject search query fallbacks or dummy domains
  if (
    resource.url.includes("google.com/search") ||
    resource.url.includes("example.com") ||
    resource.url.includes("placeholder.com")
  ) {
    return false;
  }
  return true;
}

export function canonicalResourceUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^utm_/i.test(key) || key === "fbclid" || key === "gclid") url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString().replace(/\/$/, "");
  } catch { return ""; }
}

export function sanitizeLearningResource(resource: LearningResource): LearningResource {
  const cleanThumb = resource.thumbnailUrl && isValidUrl(resource.thumbnailUrl)
    && resource.thumbnailVerification?.status === "verified"
    && resource.thumbnailVerification.sourceUrl === resource.thumbnailUrl
    ? resource.thumbnailUrl
    : undefined;

  return {
    ...resource,
    source: resource.source || "curated",
    verificationStatus: resource.verificationStatus || (resource.isVerified ? "verified" : "unverified"),
    thumbnailUrl: cleanThumb,
    skills: Array.isArray(resource.skills) ? resource.skills.map((s) => s.toLowerCase().trim()) : [],
    subskills: Array.isArray(resource.subskills) ? resource.subskills.map((s) => s.toLowerCase().trim()) : [],
    careerPaths: Array.isArray(resource.careerPaths) ? resource.careerPaths.map((c) => c.toLowerCase().trim()) : [],
    academicPrograms: Array.isArray(resource.academicPrograms) ? resource.academicPrograms.map((a) => a.trim()) : [],
    tags: Array.isArray(resource.tags) ? resource.tags.map((t) => t.toLowerCase().trim()) : [],
    trustScore: typeof resource.trustScore === "number" ? Math.max(1, Math.min(100, resource.trustScore)) : 80,
  };
}

export function validateAndSanitizeCatalog(
  resources: LearningResource[],
  categories: LearningCategory[]
): {
  validResources: LearningResource[];
  validCategories: LearningCategory[];
} {
  const validResources: LearningResource[] = [];
  const seenIds = new Set<string>();

  for (const r of resources) {
    if (!r || typeof r !== "object") continue;
    if (seenIds.has(r.id)) continue;
    if (!validateLearningResource(r)) continue;
    if (isSeminarExpired(r)) continue; // Filter out expired seminars

    seenIds.add(r.id);
    validResources.push(sanitizeLearningResource(r));
  }

  const validCategories = (categories || []).filter((c) => c && c.id && c.name);

  return { validResources, validCategories };
}
