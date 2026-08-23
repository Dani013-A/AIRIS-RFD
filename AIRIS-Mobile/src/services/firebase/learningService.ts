import {
  getInstantCatalog,
  loadCachedCatalog,
  refreshCatalog,
  matchLearningRecommendations,
} from "../learning/learningCatalogService";
import { LearningResource } from "../../types/learning.types";

export type LearningMaterial = LearningResource;

/**
 * Backward-compatible delegating fetch function.
 * Loads verified learning resources using local cache + Firestore synchronization.
 */
export const fetchLearningMaterials = async (
  category?: string,
  degreeProgram?: string
): Promise<LearningResource[]> => {
  const cached = await loadCachedCatalog();
  // Trigger background refresh safely without blocking
  refreshCatalog().catch(() => {});

  if (!category || category === "All" || category === "all") {
    return cached.resources;
  }

  return cached.resources.filter((r) => r.category === category || r.type === category);
};

/**
 * Backward-compatible delegating seed check.
 * Safe, idempotent, non-destructive synchronization.
 */
export const seedLearningMaterialsIfEmpty = async (): Promise<void> => {
  await refreshCatalog();
};
