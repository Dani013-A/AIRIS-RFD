export type ResourceType =
  | "certification"
  | "course"
  | "seminar"
  | "documentation"
  | "practice"
  | "video"
  | "article"
  | "guide"
  | "example"
  | "module";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "all-levels";

export type EventStatus = "upcoming" | "ongoing" | "completed" | "archived" | "on-demand";

export type PrimaryLearnCategory = "for_you" | "interviews" | "resume" | "communication";

export interface SeminarMetadata {
  startDate?: string;
  endDate?: string;
  expiresAt?: string;
  registrationUrl?: string;
  eventStatus?: EventStatus;
  location?: string;
  isOnline?: boolean;
}

export interface LearningResource {
  id: string;
  title: string;
  description: string;
  provider: string;
  type: ResourceType;
  category: PrimaryLearnCategory | string;
  careerPaths: string[];
  skills: string[];
  url: string;
  thumbnailUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  priority: number;
  level?: DifficultyLevel;
  tags: string[];
  estimatedTime?: string;
  seminarMetadata?: SeminarMetadata;
  credentialCode?: string;
  aliases?: string[];
  lastVerifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LearningCategory {
  id: PrimaryLearnCategory | string;
  name: string;
  description: string;
  icon: string;
  colorToken: string;
  order: number;
  isActive: boolean;
  supportedResourceTypes: ResourceType[];
  targetRoles?: string[];
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type RecommendationTier =
  | "TIER_1_DIRECT_GAP"
  | "TIER_2_ROLE_COMPETENCY"
  | "TIER_3_SUPPORTING"
  | "TIER_4_GENERIC"
  | "TIER_5_IRRELEVANT";

export interface MatchEvidence {
  gapSubjectOverlap: boolean;
  competencyOverlap: boolean;
  roleRelevance: boolean;
  genericKeywordOnly: boolean;
  matchedConcept?: string;
}

export interface MatchedResourceItem extends LearningResource {
  relevanceScore: number;
  recommendationReason?: string;
  gapRationale?: string;
  matchedSkillGap?: string;
  matchedCompetency?: string;
  relevanceTier?: RecommendationTier;
  matchEvidence?: MatchEvidence;
  isPersonalizedGap?: boolean;
}

export interface LearningCatalogCache {
  version: number;
  timestamp: number;
  resources: LearningResource[];
  categories: LearningCategory[];
}
