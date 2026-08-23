import { LearningResource, LearningCategory } from "../../types/learning.types";

/**
 * Catalog Validator Utility.
 * Validates resources and categories before persistence or presentation.
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  try {
    const url = new URL(urlString);
    return url.protocol === "https:" && url.hostname.includes(".");
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
  if (!resource.id || !resource.title || !resource.provider || !resource.url) {
    return false;
  }
  if (!isValidUrl(resource.url)) {
    return false;
  }
  // Reject search query fallbacks
  if (resource.url.includes("google.com/search") || resource.url.includes("example.com")) {
    return false;
  }
  // If thumbnail exists, validate it's HTTPS
  if (resource.thumbnailUrl && !isValidUrl(resource.thumbnailUrl)) {
    return false;
  }
  return true;
}

export function sanitizeLearningResource(resource: LearningResource): LearningResource {
  const cleanThumb = resource.thumbnailUrl && isValidUrl(resource.thumbnailUrl)
    ? resource.thumbnailUrl
    : undefined;

  return {
    ...resource,
    thumbnailUrl: cleanThumb,
    skills: Array.isArray(resource.skills) ? resource.skills.map((s) => s.toLowerCase().trim()) : [],
    careerPaths: Array.isArray(resource.careerPaths) ? resource.careerPaths.map((c) => c.toLowerCase().trim()) : [],
    tags: Array.isArray(resource.tags) ? resource.tags.map((t) => t.toLowerCase().trim()) : [],
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
