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

export type VerificationStatus =
  | "verified"
  | "unverified"
  | "broken"
  | "redirected"
  | "review_required";

export interface VerificationMetadata {
  status: VerificationStatus;
  checkedAt: string;
  finalUrl?: string;
  statusCode?: number;
  contentType?: string;
  providerDomain?: string;
  verificationMethod?: "http" | "manual" | "source_review";
  sourceUrl?: string;
  contentReviewed?: boolean;
  reviewedTitle?: string;
  reviewedProvider?: string;
}

export interface AccreditationMetadata {
  bodyName: string;
  isOfficialCredential: boolean;
  accreditationLevel?: string;
}

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
  careerStages?: string[];
  careerPaths: string[];
  skills: string[];
  subskills?: string[];
  academicPrograms?: string[];
  departments?: string[];
  careerDomains?: string[];
  prerequisites?: string[];
  url: string;
  thumbnailUrl?: string;
  thumbnailVerification?: { status: "verified"; sourceUrl: string; checkedAt: string };
  isVerified: boolean;
  isActive: boolean;
  priority: number;
  trustScore?: number;
  level?: DifficultyLevel;
  tags: string[];
  estimatedTime?: string;
  seminarMetadata?: SeminarMetadata;
  accreditation?: AccreditationMetadata;
  verification?: VerificationMetadata;
  verificationStatus?: VerificationStatus;
  credentialCode?: string;
  aliases?: string[];
  source?: "curated" | "ai_generated" | string;
  lastVerifiedAt?: string;
  lastReviewedAt?: string;
  reviewNotes?: string;
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
  subskillOverlap?: boolean;
  competencyOverlap: boolean;
  roleRelevance: boolean;
  academicRelevance?: boolean;
  genericKeywordOnly: boolean;
  matchedConcept?: string;
  matchedGapName?: string;
  gapImportance?: "high" | "medium" | "low";
}

export interface MatchedResourceItem extends LearningResource {
  origin?: "hardcoded" | "ai_discovered";
  access?: string;
  expectedOutcome?: string;
  relevanceScore: number;
  recommendationReason?: string;
  gapRationale?: string;
  matchedSkillGap?: string;
  matchedCompetency?: string;
  relevanceTier?: RecommendationTier;
  matchEvidence?: MatchEvidence;
  isPersonalizedGap?: boolean;
}

export interface AcademicDomainProfile {
  id: string;
  name: string;
  domainKeywords: string[];
  coreCompetencies: string[];
  primaryCareers: string[];
}

export interface PersonalizedLearningProfile {
  academicDomain: AcademicDomainProfile | null;
  careerDomain: any | null;
  compatibility: "ALIGNED" | "PIVOT" | "DISTANT";
  targetPosition: string;
  degreeProgram: string;
  collegeDomain: string;
  department: string;
  resumeProfile: any;
  normalizedGaps: any[];
}

export interface LearningCatalogCache {
  version: number;
  timestamp: number;
  resources: LearningResource[];
  categories: LearningCategory[];
}
