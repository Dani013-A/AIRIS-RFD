import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../../config/firebase";
import { DEFAULT_LEARNING_CATEGORIES } from "../../data/learningCategories";
import { VERIFIED_LEARNING_CATALOG } from "../../data/verifiedLearningCatalog";
import {
  LearningCategory,
  LearningCatalogCache,
  LearningResource,
  MatchedResourceItem,
  MatchEvidence,
  PrimaryLearnCategory,
  RecommendationTier,
  ResourceType,
} from "../../types/learning.types";
import { validateAndSanitizeCatalog, validateLearningResource } from "./catalogValidator";

const CACHE_STORAGE_KEY = "@airis_learning_catalog_v4";
const CACHE_VERSION = 4;

const RESOURCES_COLLECTION = "learning_resources";
const CATEGORIES_COLLECTION = "learning_categories";

// In-memory cache for synchronous first-paint access
let memoryCache: LearningCatalogCache | null = null;
let isRefreshing = false;
const subscribers = new Set<(catalog: { resources: LearningResource[]; categories: LearningCategory[] }) => void>();

/**
 * Initializes in-memory cache from bootstrap seed immediately.
 */
function getInitialSeedCache(): LearningCatalogCache {
  const { validResources, validCategories } = validateAndSanitizeCatalog(
    VERIFIED_LEARNING_CATALOG,
    DEFAULT_LEARNING_CATEGORIES
  );
  return {
    version: CACHE_VERSION,
    timestamp: Date.now(),
    resources: validResources,
    categories: validCategories,
  };
}

/**
 * Synchronous first-paint accessor. Returns memory cache or seed data immediately.
 */
export function getInstantCatalog(): { resources: LearningResource[]; categories: LearningCategory[] } {
  if (memoryCache && memoryCache.resources.length > 0) {
    return {
      resources: memoryCache.resources,
      categories: memoryCache.categories,
    };
  }
  const seed = getInitialSeedCache();
  memoryCache = seed;
  return {
    resources: seed.resources,
    categories: seed.categories,
  };
}

/**
 * Clears in-memory catalog cache for user session isolation upon logout/account switch.
 */
export function clearLearningMemoryCache(): void {
  memoryCache = null;
}

/**
 * Loads cache from AsyncStorage and populates memory cache.
 */
export async function loadCachedCatalog(): Promise<{ resources: LearningResource[]; categories: LearningCategory[] }> {
  try {
    const rawData = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
    if (rawData) {
      const parsed: LearningCatalogCache = JSON.parse(rawData);
      if (parsed.version === CACHE_VERSION && parsed.resources && parsed.resources.length > 0) {
        const { validResources, validCategories } = validateAndSanitizeCatalog(
          parsed.resources,
          parsed.categories || DEFAULT_LEARNING_CATEGORIES
        );
        memoryCache = {
          version: CACHE_VERSION,
          timestamp: parsed.timestamp || Date.now(),
          resources: validResources,
          categories: validCategories,
        };
        return { resources: validResources, categories: validCategories };
      }
    }
  } catch (err) {
    console.log("Failed to load local learning cache:", err);
  }

  const initial = getInstantCatalog();
  return initial;
}

/**
 * Saves validated catalog data to AsyncStorage and memory cache.
 */
async function saveCatalogToCache(
  resources: LearningResource[],
  categories: LearningCategory[]
): Promise<void> {
  try {
    const { validResources, validCategories } = validateAndSanitizeCatalog(resources, categories);
    const cacheData: LearningCatalogCache = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      resources: validResources,
      categories: validCategories,
    };
    memoryCache = cacheData;
    await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheData));

    // Notify listeners
    subscribers.forEach((callback) => {
      try {
        callback({ resources: validResources, categories: validCategories });
      } catch (e) {
        console.log("Subscriber notification error:", e);
      }
    });
  } catch (err) {
    console.log("Failed to save learning catalog cache:", err);
  }
}

/**
 * Seeds Firestore collections if empty, safely and idempotently.
 */
async function seedFirestoreIfEmpty(): Promise<void> {
  try {
    const resCol = collection(db, RESOURCES_COLLECTION);
    const resSnap = await getDocs(resCol);

    if (resSnap.empty) {
      const batch = writeBatch(db);
      for (const item of VERIFIED_LEARNING_CATALOG) {
        const itemRef = doc(db, RESOURCES_COLLECTION, item.id);
        batch.set(itemRef, item);
      }
      await batch.commit();
    }

    const catCol = collection(db, CATEGORIES_COLLECTION);
    const catSnap = await getDocs(catCol);

    if (catSnap.empty) {
      const catBatch = writeBatch(db);
      for (const cat of DEFAULT_LEARNING_CATEGORIES) {
        const catRef = doc(db, CATEGORIES_COLLECTION, cat.id);
        catBatch.set(catRef, cat);
      }
      await catBatch.commit();
    }
  } catch (err) {
    // Quiet fallback to local verified catalog
  }
}

/**
 * Background non-blocking refresh from Firestore.
 * Updates local cache and notifies UI silently.
 */
export async function refreshCatalog(): Promise<{ resources: LearningResource[]; categories: LearningCategory[] }> {
  if (isRefreshing) {
    return getInstantCatalog();
  }

  isRefreshing = true;
  try {
    // 1. Ensure Firestore has seed if completely empty
    await seedFirestoreIfEmpty();

    // 2. Fetch resources from Firestore
    const resCol = collection(db, RESOURCES_COLLECTION);
    const resSnap = await getDocs(resCol);
    const firestoreResources: LearningResource[] = [];

    resSnap.forEach((docSnap) => {
      const data = docSnap.data() as Partial<LearningResource>;
      if (data && data.title && data.url) {
        firestoreResources.push({
          id: docSnap.id,
          ...data,
        } as LearningResource);
      }
    });

    // 3. Fetch categories from Firestore
    const catCol = collection(db, CATEGORIES_COLLECTION);
    const catSnap = await getDocs(catCol);
    const firestoreCategories: LearningCategory[] = [];

    catSnap.forEach((docSnap) => {
      const data = docSnap.data() as Partial<LearningCategory>;
      if (data && data.id && data.name) {
        firestoreCategories.push({
          id: docSnap.id,
          ...data,
        } as LearningCategory);
      }
    });

    // 4. Fall back to seed catalog if Firestore returned 0 valid items
    const finalResources = firestoreResources.length > 0 ? firestoreResources : VERIFIED_LEARNING_CATALOG;
    const finalCategories = firestoreCategories.length > 0 ? firestoreCategories : DEFAULT_LEARNING_CATEGORIES;

    // 5. Validate, sanitize, and cache
    await saveCatalogToCache(finalResources, finalCategories);

    return { resources: memoryCache?.resources || finalResources, categories: memoryCache?.categories || finalCategories };
  } catch (err) {
    return getInstantCatalog();
  } finally {
    isRefreshing = false;
  }
}

/**
 * Subscribe to catalog updates.
 */
export function subscribeToCatalog(
  callback: (catalog: { resources: LearningResource[]; categories: LearningCategory[] }) => void
): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Career Domain Profiles Ontology.
 * Defines career tracks, role synonyms, core competencies, and supporting domains.
 * Completely dynamic across any role without hardcoded role switches.
 */
export interface CareerDomainProfile {
  id: string;
  name: string;
  roleKeywords: string[];
  coreCompetencies: string[];
  supportingDomains: string[];
}

export const CAREER_DOMAINS: CareerDomainProfile[] = [
  {
    id: "data_analytics",
    name: "Data Analytics & Business Intelligence",
    roleKeywords: [
      "data analyst",
      "data analytics",
      "business intelligence",
      "bi analyst",
      "bi developer",
      "data scientist",
      "data engineer",
      "data management",
      "analytics specialist",
      "reporting analyst",
      "data",
      "statistician",
      "data science",
    ],
    coreCompetencies: [
      "sql",
      "power bi",
      "tableau",
      "excel",
      "pandas",
      "python",
      "data visualization",
      "statistics",
      "data cleaning",
      "data modeling",
      "analytics",
      "business intelligence",
      "dax",
      "power query",
      "r",
      "predictive modeling",
      "data warehouse",
      "cloud data warehousing",
      "etl",
      "relational modeling",
      "bigquery",
      "snowflake",
      "scikit-learn",
      "data manipulation",
      "aggregations",
      "spreadsheets",
      "regression",
    ],
    supportingDomains: ["database_administration", "general_tech"],
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity & Information Security",
    roleKeywords: [
      "cybersecurity",
      "security analyst",
      "soc analyst",
      "information security",
      "infosec",
      "penetration tester",
      "security engineer",
      "network security",
      "cyber",
      "security specialist",
      "security officer",
      "threat analyst",
    ],
    coreCompetencies: [
      "cybersecurity",
      "network security",
      "cryptography",
      "threat analysis",
      "incident response",
      "siem",
      "splunk",
      "wireshark",
      "linux",
      "vulnerability assessment",
      "owasp",
      "web security",
      "iam",
      "security+",
      "threat intelligence",
      "application security",
    ],
    supportingDomains: ["cloud_devops", "general_tech"],
  },
  {
    id: "software_engineering",
    name: "Software Engineering & Application Development",
    roleKeywords: [
      "software engineer",
      "software developer",
      "full stack",
      "backend developer",
      "frontend developer",
      "web developer",
      "programmer",
      "coder",
      "software",
      "application developer",
    ],
    coreCompetencies: [
      "programming",
      "algorithms",
      "data structures",
      "git",
      "github",
      "version control",
      "rest api",
      "backend development",
      "frontend",
      "javascript",
      "python",
      "django",
      "react",
      "testing",
      "databases",
      "system design",
      "mysql",
      "es6",
      "async/await",
    ],
    supportingDomains: ["cloud_devops", "database_administration", "qa_testing", "general_tech"],
  },
  {
    id: "cloud_devops",
    name: "Cloud & DevOps Engineering",
    roleKeywords: [
      "cloud engineer",
      "devops",
      "devops engineer",
      "cloud architect",
      "site reliability engineer",
      "sre",
      "infrastructure engineer",
      "cloud specialist",
      "solutions architect",
      "cloud",
    ],
    coreCompetencies: [
      "aws",
      "cloud",
      "cloud computing",
      "docker",
      "containers",
      "devops",
      "iam",
      "s3",
      "ec2",
      "vpc",
      "cloud architecture",
      "kubernetes",
      "terraform",
      "serverless",
      "microservices",
      "high availability",
      "distributed systems",
      "clf-c02",
      "saa-c03",
    ],
    supportingDomains: ["software_engineering", "cybersecurity", "general_tech"],
  },
  {
    id: "ui_ux",
    name: "UI/UX & Product Design",
    roleKeywords: [
      "ui/ux",
      "ux designer",
      "ui designer",
      "product designer",
      "interaction designer",
      "user experience",
      "ux/ui",
      "visual designer",
      "ux researcher",
      "design",
    ],
    coreCompetencies: [
      "figma",
      "ux design",
      "ui design",
      "user research",
      "prototyping",
      "wireframing",
      "design systems",
      "auto layout",
      "usability",
      "interaction design",
    ],
    supportingDomains: ["software_engineering", "general_tech"],
  },
  {
    id: "qa_testing",
    name: "Quality Assurance & Automated Testing",
    roleKeywords: [
      "qa engineer",
      "quality assurance",
      "test automation",
      "tester",
      "sdet",
      "qa analyst",
      "software tester",
      "automation engineer",
      "test",
    ],
    coreCompetencies: [
      "qa",
      "testing",
      "automated testing",
      "cypress",
      "e2e testing",
      "unit testing",
      "selenium",
      "test cases",
      "quality assurance",
      "assertion",
      "test suite",
    ],
    supportingDomains: ["software_engineering", "general_tech"],
  },
  {
    id: "mobile_development",
    name: "Mobile Application Development",
    roleKeywords: [
      "mobile developer",
      "mobile engineer",
      "ios developer",
      "android developer",
      "react native developer",
      "flutter developer",
      "mobile app developer",
      "mobile",
    ],
    coreCompetencies: [
      "react native",
      "mobile",
      "mobile development",
      "expo",
      "ios",
      "android",
      "swift",
      "kotlin",
      "flutter",
      "typescript",
    ],
    supportingDomains: ["software_engineering", "general_tech"],
  },
  {
    id: "database_administration",
    name: "Database Administration & Relational Modeling",
    roleKeywords: [
      "database administrator",
      "dba",
      "database engineer",
      "sql developer",
      "database specialist",
    ],
    coreCompetencies: [
      "postgresql",
      "mysql",
      "sql",
      "relational modeling",
      "indexing",
      "database administration",
      "acid transactions",
      "database performance",
      "database",
    ],
    supportingDomains: ["data_analytics", "software_engineering", "general_tech"],
  },
];

/**
 * Dynamically resolves career domain profiles for a given target role string.
 */
export function resolveCareerDomains(targetRole: string): CareerDomainProfile[] {
  const targetLower = targetRole.toLowerCase().trim();
  if (!targetLower) return [];

  const matchedDomains: Array<{ domain: CareerDomainProfile; score: number }> = [];

  for (const domain of CAREER_DOMAINS) {
    let score = 0;
    for (const kw of domain.roleKeywords) {
      if (targetLower === kw) {
        score += 100;
      } else if (targetLower.includes(kw) || kw.includes(targetLower)) {
        score += 50;
      }
    }
    if (score > 0) {
      matchedDomains.push({ domain, score });
    }
  }

  matchedDomains.sort((a, b) => b.score - a.score);
  return matchedDomains.map((m) => m.domain);
}

export const GENERIC_TECHNOLOGY_WORDS = new Set([
  "python",
  "sql",
  "javascript",
  "java",
  "c++",
  "c#",
  "r",
  "html",
  "css",
  "typescript",
  "cloud",
  "aws",
  "azure",
  "gcp",
  "performance",
  "database",
  "databases",
  "programming",
  "technology",
  "technologies",
  "development",
  "developer",
  "security",
  "web",
  "software",
  "testing",
  "design",
  "analytics",
  "analysis",
  "data",
  "management",
  "tools",
  "tool",
  "code",
  "coding",
  "api",
  "apis",
  "framework",
  "frameworks",
  "advanced",
  "basic",
  "intermediate",
  "introduction",
  "fundamentals",
  "practices",
  "principles",
  "engineering",
  "engineer",
  "operations",
  "systems",
  "system",
  "architecture",
  "reporting",
  "dashboard",
  "dashboards",
  "application",
  "applications",
  "project",
  "projects",
  "methods",
  "methodologies",
  "query",
  "queries",
  "model",
  "models",
  "modeling",
  "modelling",
  "technique",
  "techniques",
  "skill",
  "skills",
  "concept",
  "concepts",
  "overview",
  "guide",
  "guidebook",
  "standard",
  "standards",
  "statistical",
  "statistics",
]);

/**
 * Normalized representation of a user skill gap with substantive concept extraction.
 */
export interface NormalizedGap {
  raw: string;
  normalized: string;
  tokens: string[];
  substantiveConcepts: string[];
  discriminatingTokens: string[];
  importance: string;
  reason?: string;
}

/**
 * Parses and normalizes a skill gap string, extracting substantive multi-word phrases and non-generic concepts.
 */
export function normalizeGap(
  rawGap: string,
  importance: string = "high",
  reason?: string
): NormalizedGap {
  const raw = rawGap.trim();
  const normalized = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D-]/g, " ")
    .replace(/[()[\]{}:;,"'/\\&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = normalized.split(" ").filter((t) => t.length >= 2);

  const discriminatingTokens = tokens.filter((t) => !GENERIC_TECHNOLOGY_WORDS.has(t) && t.length >= 3);

  // Extract substantive multi-word domain concepts
  const substantiveConcepts: string[] = [];

  // 1. Compound concept mappings based on substantive domain concepts
  if (normalized.includes("time series") || normalized.includes("forecasting") || normalized.includes("arima")) {
    substantiveConcepts.push("time series forecasting", "time series analysis", "forecasting", "arima", "temporal modeling");
  }
  if (normalized.includes("performance") || normalized.includes("tuning") || normalized.includes("optimization") || normalized.includes("indexing") || normalized.includes("execution plan")) {
    if (normalized.includes("sql") || normalized.includes("query") || normalized.includes("database") || normalized.includes("tuning") || normalized.includes("optimization")) {
      substantiveConcepts.push("sql performance tuning", "query optimization", "performance tuning", "database indexing", "execution plans", "database tuning");
    }
  }
  if (normalized.includes("governance") || normalized.includes("privacy") || normalized.includes("gdpr") || normalized.includes("stewardship") || normalized.includes("compliance")) {
    substantiveConcepts.push("data governance", "data privacy", "gdpr", "data protection", "data stewardship", "data compliance");
  }
  if (normalized.includes("visualization") || normalized.includes("tableau") || normalized.includes("power bi") || normalized.includes("dashboard")) {
    substantiveConcepts.push("data visualization", "tableau", "power bi", "dashboarding");
  }
  if (normalized.includes("predictive") || (normalized.includes("machine learning") && (normalized.includes("model") || normalized.includes("algorithm")))) {
    substantiveConcepts.push("predictive modeling", "machine learning", "regression");
  }
  if (normalized.includes("warehousing") || normalized.includes("data warehouse") || normalized.includes("bigquery") || normalized.includes("snowflake")) {
    substantiveConcepts.push("cloud data warehousing", "data warehouse", "bigquery", "snowflake");
  }
  if (normalized.includes("network security") || normalized.includes("threat") || normalized.includes("siem") || normalized.includes("soc") || normalized.includes("cryptography")) {
    substantiveConcepts.push("network security", "threat analysis", "siem", "incident response", "cryptography");
  }

  // 2. Add full phrase if substantive
  if (tokens.some((t) => !GENERIC_TECHNOLOGY_WORDS.has(t))) {
    substantiveConcepts.push(normalized);
  }

  return {
    raw,
    normalized,
    tokens,
    substantiveConcepts: Array.from(new Set(substantiveConcepts)),
    discriminatingTokens: Array.from(new Set(discriminatingTokens)),
    importance: importance.toLowerCase(),
    reason,
  };
}

/**
 * Resolves candidate resource domain(s) strictly from declared career paths and role keywords.
 */
export function getResourceDomains(resource: LearningResource): CareerDomainProfile[] {
  const resourceCareerPaths = (resource.careerPaths || []).map((c) => c.toLowerCase());
  return CAREER_DOMAINS.filter((d) =>
    resourceCareerPaths.some((cp) => d.roleKeywords.includes(cp) || cp === d.id || cp.includes(d.id))
  );
}

export interface GapEvaluationResult {
  isMatch: boolean;
  isDirectGap: boolean;
  matchScore: number;
  matchedConcept?: string;
  evidence: MatchEvidence;
}

/**
 * Evaluates whether a candidate resource truly teaches the identified gap subject matter.
 * Prevents generic tools (e.g. Python, SQL, cloud, performance) from triggering false-positive direct gap matches.
 */
export function evaluateGapMatch(
  gap: NormalizedGap,
  resource: LearningResource,
  userPrimaryDomain: CareerDomainProfile | null
): GapEvaluationResult {
  const resourceSkills = (resource.skills || []).map((s) => s.toLowerCase().trim());
  const resourceTags = (resource.tags || []).map((t) => t.toLowerCase().trim());
  const resourceTitleLower = resource.title.toLowerCase();
  const resourceCareerPaths = (resource.careerPaths || []).map((c) => c.toLowerCase());

  const resourceDomains = getResourceDomains(resource);
  const resourceDomainIds = resourceDomains.map((d) => d.id);

  const isRoleRelevant =
    !userPrimaryDomain ||
    resourceDomainIds.includes(userPrimaryDomain.id) ||
    resourceDomainIds.some((id) => userPrimaryDomain.supportingDomains.includes(id)) ||
    resourceCareerPaths.includes("all tech roles") ||
    resourceCareerPaths.includes("all career paths");

  // Check 1: Substantive Domain Concept Match
  for (const concept of gap.substantiveConcepts) {
    if (GENERIC_TECHNOLOGY_WORDS.has(concept) || concept.length < 4) continue;

    // Check resource declared skills with exact equality or robust compound inclusion
    for (const skill of resourceSkills) {
      if (GENERIC_TECHNOLOGY_WORDS.has(skill)) continue;

      const isExactMatch = skill === concept;
      const isCompoundMatch =
        (concept === "time series forecasting" && (skill === "time series forecasting" || skill === "time series analysis" || skill === "forecasting" || skill === "arima")) ||
        (concept === "sql performance tuning" && (skill === "sql performance tuning" || skill === "query optimization" || skill === "database indexing" || skill === "execution plans" || skill === "performance tuning")) ||
        (concept === "data governance" && (skill === "data governance" || skill === "data privacy" || skill === "gdpr" || skill === "data protection" || skill === "data stewardship" || skill === "dataplex")) ||
        (concept === "cloud data warehousing" && (skill === "cloud data warehousing" || skill === "data warehouse" || skill === "bigquery" || skill === "snowflake")) ||
        (concept === "predictive modeling" && (skill === "predictive modeling" || skill === "scikit-learn" || skill === "machine learning")) ||
        (concept === "data visualization" && (skill === "data visualization" || skill === "power bi" || skill === "tableau")) ||
        (concept === "network security" && (skill === "network security" || skill === "threat analysis" || skill === "siem" || skill === "splunk" || skill === "wireshark"));

      if (isExactMatch || isCompoundMatch) {
        return {
          isMatch: true,
          isDirectGap: isRoleRelevant,
          matchScore: 500,
          matchedConcept: skill,
          evidence: {
            gapSubjectOverlap: true,
            competencyOverlap: true,
            roleRelevance: isRoleRelevant,
            genericKeywordOnly: false,
            matchedConcept: skill,
          },
        };
      }
    }

    // Check title
    if (resourceTitleLower.includes(concept) && concept.length >= 6) {
      return {
        isMatch: true,
        isDirectGap: isRoleRelevant,
        matchScore: 450,
        matchedConcept: concept,
        evidence: {
          gapSubjectOverlap: true,
          competencyOverlap: true,
          roleRelevance: isRoleRelevant,
          genericKeywordOnly: false,
          matchedConcept: concept,
        },
      };
    }

    // Check tags
    if (resourceTags.some((t) => !GENERIC_TECHNOLOGY_WORDS.has(t) && t === concept)) {
      return {
        isMatch: true,
        isDirectGap: isRoleRelevant,
        matchScore: 400,
        matchedConcept: concept,
        evidence: {
          gapSubjectOverlap: true,
          competencyOverlap: true,
          roleRelevance: isRoleRelevant,
          genericKeywordOnly: false,
          matchedConcept: concept,
        },
      };
    }
  }

  // Check 2: Discriminating Non-Generic Token Matches (Multi-word roots)
  for (const token of gap.discriminatingTokens) {
    if (GENERIC_TECHNOLOGY_WORDS.has(token) || token.length < 5) continue;
    const root = token.replace(/ing$|ed$|s$|ive$|tion$/, "");

    for (const skill of resourceSkills) {
      if (GENERIC_TECHNOLOGY_WORDS.has(skill)) continue;
      if (skill === token || (root.length >= 5 && skill === root)) {
        return {
          isMatch: true,
          isDirectGap: isRoleRelevant,
          matchScore: 350,
          matchedConcept: skill,
          evidence: {
            gapSubjectOverlap: true,
            competencyOverlap: true,
            roleRelevance: isRoleRelevant,
            genericKeywordOnly: false,
            matchedConcept: skill,
          },
        };
      }
    }
  }

  // Check 3: Check if ONLY a broad generic technology word overlapped (e.g. "python", "sql", "performance")
  const genericMatch = resourceSkills.find((s) => gap.tokens.includes(s) && GENERIC_TECHNOLOGY_WORDS.has(s));
  if (genericMatch) {
    return {
      isMatch: false,
      isDirectGap: false,
      matchScore: 0,
      matchedConcept: genericMatch,
      evidence: {
        gapSubjectOverlap: false,
        competencyOverlap: false,
        roleRelevance: isRoleRelevant,
        genericKeywordOnly: true,
        matchedConcept: genericMatch,
      },
    };
  }

  return {
    isMatch: false,
    isDirectGap: false,
    matchScore: 0,
    evidence: {
      gapSubjectOverlap: false,
      competencyOverlap: false,
      roleRelevance: isRoleRelevant,
      genericKeywordOnly: false,
    },
  };
}

/**
 * Resume Credential and Demonstrated Skill Profile for high-precision deduplication.
 */
export interface ResumeCredentialProfile {
  rawText: string;
  normalizedRawText: string;
  normalizedTitles: Set<string>;
  credentialCodes: Set<string>;
  aliases: Set<string>;
  completedCourseTitles: Set<string>;
  demonstratedSkills: Set<string>;
}

/**
 * Extracts a structured credential and skill profile from resume rawText and structured data.
 */
export function extractResumeCredentialProfile(
  rawText: string = "",
  structuredData?: any,
  detectedSkills: string[] = []
): ResumeCredentialProfile {
  const cleanRaw = (rawText || "").toLowerCase();
  const normalizedRaw = cleanRaw.replace(/[^a-z0-9\s]/g, " ");

  const normalizedTitles = new Set<string>();
  const credentialCodes = new Set<string>();
  const aliases = new Set<string>();
  const completedCourseTitles = new Set<string>();
  const demonstratedSkills = new Set<string>(
    (detectedSkills || []).map((s) => s.toLowerCase().trim()).filter(Boolean)
  );

  // 1. Structured certifications
  if (structuredData && Array.isArray(structuredData.certifications)) {
    for (const cert of structuredData.certifications) {
      const certName = typeof cert === "string" ? cert : cert.name || cert.title || "";
      if (certName) {
        normalizedTitles.add(certName.toLowerCase().trim());
        normalizedTitles.add(certName.toLowerCase().replace(/[^a-z0-9]/g, ""));
      }
    }
  }

  // 2. Structured courses / trainings / practice
  const courseArrays = [
    structuredData?.courses,
    structuredData?.trainings,
    structuredData?.trainingsAndCertifications,
    structuredData?.practice,
  ];

  for (const arr of courseArrays) {
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const itemName = typeof item === "string" ? item : item.name || item.title || "";
        if (itemName) {
          completedCourseTitles.add(itemName.toLowerCase().trim());
          completedCourseTitles.add(itemName.toLowerCase().replace(/[^a-z0-9]/g, ""));
        }
      }
    }
  }

  // 3. Structured skills
  if (structuredData && Array.isArray(structuredData.skills)) {
    for (const skill of structuredData.skills) {
      const skillName = typeof skill === "string" ? skill : skill.name || "";
      if (skillName) {
        demonstratedSkills.add(skillName.toLowerCase().trim());
      }
    }
  }

  // 4. Scan raw text for standard credential codes
  const KNOWN_CREDENTIAL_CODES = [
    "SY0-701", "SY0-601", "CS0-003", "CS0-002", "CLF-C02", "CLF-C01",
    "SAA-C03", "SAA-C02", "DVA-C02", "DVA-C01", "AZ-900", "AZ-204",
    "PL-300", "DP-900", "DP-300", "AI-900", "200-301", "CISSP", "CEH",
    "PMP", "CTFL", "1Z0-808", "CC", "MLS-C01", "N10-008"
  ];

  for (const code of KNOWN_CREDENTIAL_CODES) {
    const codeRegex = new RegExp(`\\b${code.replace("-", "[-\\s]?")}\\b`, "i");
    if (codeRegex.test(cleanRaw)) {
      credentialCodes.add(code.toUpperCase());
    }
  }

  // 5. Scan raw text for well-known credential aliases
  const KNOWN_ALIASES = [
    "security+", "security plus", "comptia security",
    "network+", "network plus", "comptia network",
    "cysa+", "cysa plus", "comptia cysa",
    "cloud practitioner", "aws cloud practitioner",
    "solutions architect", "aws solutions architect",
    "power bi data analyst", "power bi certified", "power bi certification",
    "azure fundamentals", "azure data fundamentals", "azure ai fundamentals",
    "google data analytics", "google cybersecurity", "google ux design",
    "meta front end developer", "meta frontend developer",
    "meta back end developer", "meta backend developer",
    "meta react native",
    "ibm data analyst", "ibm cybersecurity analyst",
    "certified ethical hacker", "ethical hacker",
    "certified in cybersecurity",
    "ccna", "cisco ccna",
    "tableau desktop specialist", "tableau certified",
    "w3schools sql", "w3schools sql practice"
  ];

  for (const alias of KNOWN_ALIASES) {
    if (cleanRaw.includes(alias)) {
      aliases.add(alias);
    }
  }

  return {
    rawText: cleanRaw,
    normalizedRawText: normalizedRaw,
    normalizedTitles,
    credentialCodes,
    aliases,
    completedCourseTitles,
    demonstratedSkills,
  };
}

/**
 * Robust check if a resource credential or course already exists in the user's resume.
 */
export function isResourceAlreadyInResume(
  resource: LearningResource,
  profile: ResumeCredentialProfile
): { isDuplicate: boolean; reason?: string } {
  // 1. Check credential code
  if (resource.credentialCode && profile.credentialCodes.has(resource.credentialCode.toUpperCase())) {
    return {
      isDuplicate: true,
      reason: `Credential code ${resource.credentialCode} detected in resume.`,
    };
  }

  // 2. Check known aliases
  if (resource.aliases && resource.aliases.length > 0) {
    for (const alias of resource.aliases) {
      const aliasLower = alias.toLowerCase().trim();
      if (
        profile.aliases.has(aliasLower) ||
        profile.rawText.includes(aliasLower) ||
        Array.from(profile.completedCourseTitles).some((t) => t.includes(aliasLower) || aliasLower.includes(t)) ||
        Array.from(profile.normalizedTitles).some((t) => t.includes(aliasLower) || aliasLower.includes(t))
      ) {
        return {
          isDuplicate: true,
          reason: `Credential alias "${alias}" detected in resume.`,
        };
      }
    }
  }

  // 3. Check normalized title against structured data
  const normTitle = resource.title.toLowerCase().trim();
  const cleanTitle = normTitle.replace(/[^a-z0-9]/g, "");

  if (profile.normalizedTitles.has(normTitle) || profile.normalizedTitles.has(cleanTitle)) {
    return {
      isDuplicate: true,
      reason: `Certification "${resource.title}" detected in resume structured data.`,
    };
  }

  if (profile.completedCourseTitles.has(normTitle) || profile.completedCourseTitles.has(cleanTitle)) {
    return {
      isDuplicate: true,
      reason: `Course "${resource.title}" detected in completed resume courses.`,
    };
  }

  // Check structured course/cert title substrings
  for (const t of profile.completedCourseTitles) {
    if (t.length > 10 && (normTitle.includes(t) || t.includes(normTitle))) {
      return {
        isDuplicate: true,
        reason: `Course "${resource.title}" matches resume course "${t}".`,
      };
    }
  }
  for (const t of profile.normalizedTitles) {
    if (t.length > 10 && (normTitle.includes(t) || t.includes(normTitle))) {
      return {
        isDuplicate: true,
        reason: `Certification "${resource.title}" matches resume certification "${t}".`,
      };
    }
  }

  // 4. Exact title match in raw text if substantive length
  if (normTitle.length > 12 && profile.rawText.includes(normTitle)) {
    return {
      isDuplicate: true,
      reason: `Title "${resource.title}" matches resume content.`,
    };
  }

  return { isDuplicate: false };
}

/**
 * Demotes basic/introductory resources if the candidate already demonstrates proficiency in that base skill,
 * unless that specific skill was explicitly flagged as a missing gap.
 */
export function isResourceDemotedForSkillDepth(
  resource: LearningResource,
  profile: ResumeCredentialProfile,
  gaps: NormalizedGap[]
): boolean {
  const isBeginner =
    resource.level === "beginner" ||
    /\b(for beginners|basics|fundamentals|introduction to|intro to)\b/i.test(resource.title);

  if (!isBeginner) return false;

  const primarySkill = (resource.skills[0] || "").toLowerCase().trim();
  if (!primarySkill) return false;

  const isDemonstrated = profile.demonstratedSkills.has(primarySkill);
  if (!isDemonstrated) return false;

  // Check if this specific skill is explicitly flagged as an identified gap
  const isExplicitGap = gaps.some((g) =>
    g.raw.toLowerCase().includes(primarySkill) ||
    g.substantiveConcepts.some((c) => c.includes(primarySkill))
  );

  return !isExplicitGap;
}

/**
 * Recommendation matching parameters.
 */
export interface RecommendationMatchParams {
  targetPosition?: string;
  degreeProgram?: string;
  skillGaps?: Array<{ skill: string; importance?: string; reason?: string }>;
  skillsToLearn?: Array<{ title: string; priority?: string; description?: string }>;
  detectedSkills?: string[];
  missingSkills?: string[];
  learningSnapshot?: any;
  categoryId?: PrimaryLearnCategory | string;
  resourceType?: ResourceType | "all";
  customCatalog?: LearningResource[];
  rawResumeText?: string;
  structuredResumeData?: any;
}

/**
 * Universal Semantic & Domain Matching Engine.
 * Evaluates candidates against identified gaps with subject-level validation,
 * core role competencies, and supporting tracks.
 * Irrelevant disjoint domains and generic keyword false-positives are strictly excluded.
 */
export function matchLearningRecommendations(params: RecommendationMatchParams): MatchedResourceItem[] {
  const catalog = params.customCatalog || memoryCache?.resources || VERIFIED_LEARNING_CATALOG;
  const targetPos = (params.targetPosition || "").toLowerCase().trim();
  const categoryId = (params.categoryId || "for_you").toLowerCase();
  const resourceType = params.resourceType || "all";

  // Build resume credential and demonstrated skill profile for deduplication
  const resumeProfile = extractResumeCredentialProfile(
    params.rawResumeText,
    params.structuredResumeData,
    params.detectedSkills
  );

  // 1. GENERIC EVERGREEN CATEGORIES (Interviews, Resume, Communication)
  if (categoryId === "interviews" || categoryId === "resume" || categoryId === "communication") {
    const genericItems: MatchedResourceItem[] = [];
    const seenUrls = new Set<string>();

    for (const resource of catalog) {
      if (!resource.isActive) continue;
      if (!validateLearningResource(resource)) continue;
      if (resource.category !== categoryId) continue;
      if (resourceType !== "all" && resource.type !== resourceType) continue;

      const normUrl = resource.url.toLowerCase().trim();
      if (seenUrls.has(normUrl)) continue;
      seenUrls.add(normUrl);

      let reason = "Essential career preparation material.";
      if (categoryId === "interviews") {
        reason = "Essential interview preparation framework and technique.";
      } else if (categoryId === "resume") {
        reason = "Authoritative resume writing guide and ATS formatting standard.";
      } else if (categoryId === "communication") {
        reason = "Professional workplace communication and presentation mastery.";
      }

      genericItems.push({
        ...resource,
        relevanceScore: resource.priority || 80,
        recommendationReason: reason,
        relevanceTier: "TIER_2_ROLE_COMPETENCY",
        matchEvidence: {
          gapSubjectOverlap: false,
          competencyOverlap: true,
          roleRelevance: true,
          genericKeywordOnly: false,
        },
      });
    }

    genericItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return genericItems;
  }

  // 2. FOR YOU CATEGORY (Strict Role + Gap Personalization)
  const userDomains = resolveCareerDomains(targetPos);
  const primaryDomain = userDomains.length > 0 ? userDomains[0] : null;
  const primaryDomainId = primaryDomain ? primaryDomain.id : null;
  const supportingDomainIds = primaryDomain ? primaryDomain.supportingDomains : [];

  // Parse and normalize identified gaps with substantive concept analysis
  const normalizedGaps: NormalizedGap[] = [];
  const rawGapsList = [
    ...(params.skillGaps || []).map((g) => ({ skill: g.skill, importance: g.importance, reason: g.reason })),
    ...(params.skillsToLearn || []).map((s) => ({ skill: s.title, importance: s.priority, reason: s.description })),
  ];

  for (const g of rawGapsList) {
    if (g.skill && g.skill.trim()) {
      normalizedGaps.push(normalizeGap(g.skill, g.importance || "high", g.reason));
    }
  }

  const seenUrls = new Set<string>();
  const scoredItems: MatchedResourceItem[] = [];

  for (const resource of catalog) {
    if (!resource.isActive) continue;
    if (!validateLearningResource(resource)) continue;

    // Exclude evergreen category items (interviews, resume, communication) from For You
    if (
      resource.category === "interviews" ||
      resource.category === "resume" ||
      resource.category === "communication"
    ) {
      continue;
    }

    // Filter by resource type if requested
    if (resourceType !== "all" && resource.type !== resourceType) {
      continue;
    }

    // Check resume deduplication
    const dedupeCheck = isResourceAlreadyInResume(resource, resumeProfile);
    if (dedupeCheck.isDuplicate) {
      continue; // Exclude already-completed credential or course
    }

    // Check skill depth (demote basic beginner tutorial if skill is already demonstrated without a gap)
    const isDemotedForDepth = isResourceDemotedForSkillDepth(resource, resumeProfile, normalizedGaps);

    const normUrl = resource.url.toLowerCase().trim();
    if (seenUrls.has(normUrl)) continue;

    const resourceSkills = (resource.skills || []).map((s) => s.toLowerCase().trim());
    const resourceCareerPaths = (resource.careerPaths || []).map((c) => c.toLowerCase());

    const resourceDomains = getResourceDomains(resource);
    const resourceDomainIds = resourceDomains.map((d) => d.id);

    let tier: RecommendationTier = "TIER_5_IRRELEVANT";
    let matchedGapName: string | undefined;
    let matchedComp: string | undefined;
    let score = resource.priority || 50;
    if (isDemotedForDepth) {
      score -= 50; // Demote beginner tutorial for demonstrated skill
    }
    let reason = "";
    let itemEvidence: MatchEvidence = {
      gapSubjectOverlap: false,
      competencyOverlap: false,
      roleRelevance: false,
      genericKeywordOnly: false,
    };

    // ----------------------------------------------------
    // TIER 1: DIRECT RESUME SKILL GAP MATCH (Highest Priority)
    // ----------------------------------------------------
    let bestGapScore = 0;
    let directGapEvaluated = false;

    for (const gap of normalizedGaps) {
      const evaluation = evaluateGapMatch(gap, resource, primaryDomain);
      if (evaluation.isDirectGap && evaluation.matchScore > bestGapScore) {
        bestGapScore = evaluation.matchScore;
        matchedGapName = gap.raw;
        matchedComp = evaluation.matchedConcept || gap.raw;
        itemEvidence = evaluation.evidence;
        directGapEvaluated = true;
      }
    }

    if (directGapEvaluated && bestGapScore > 0) {
      tier = "TIER_1_DIRECT_GAP";
      score += 400 + bestGapScore;
      reason = `Directly addresses your identified gap in "${matchedGapName}" by developing ${matchedComp} for ${params.targetPosition || "your target role"}.`;
    } else {
      // ----------------------------------------------------
      // TIER 2: DIRECT TARGET ROLE CORE COMPETENCY
      // ----------------------------------------------------
      const isDirectCareerPathMatch = targetPos && resourceCareerPaths.some(
        (cp) => cp === targetPos || cp.includes(targetPos) || targetPos.includes(cp)
      );

      const isDomainMatch = primaryDomainId && resourceDomainIds.includes(primaryDomainId);

      const hasCoreCompetencyOverlap = primaryDomain && resourceSkills.some((s) =>
        primaryDomain.coreCompetencies.includes(s)
      );

      if (isDirectCareerPathMatch || (isDomainMatch && hasCoreCompetencyOverlap)) {
        tier = "TIER_2_ROLE_COMPETENCY";
        score += 200;
        matchedComp = resourceSkills.find((s) => primaryDomain?.coreCompetencies.includes(s)) || resourceSkills[0] || "core technical";
        reason = `Develops core ${matchedComp} competencies essential for ${params.targetPosition || "your target role"} roles.`;
        itemEvidence = {
          gapSubjectOverlap: false,
          competencyOverlap: true,
          roleRelevance: true,
          genericKeywordOnly: false,
          matchedConcept: matchedComp,
        };
      } else if (
        // ----------------------------------------------------
        // TIER 3: SUPPORTING COMPETENCY / OVERLAPPING DOMAIN
        // ----------------------------------------------------
        primaryDomainId &&
        resourceDomainIds.some((id) => supportingDomainIds.includes(id)) &&
        !resourceDomainIds.includes("data_analytics") &&
        !resourceCareerPaths.includes("data analyst") &&
        !resourceCareerPaths.includes("data scientist") &&
        !resourceCareerPaths.includes("cybersecurity analyst") &&
        !resourceCareerPaths.includes("ui/ux designer") &&
        !resourceCareerPaths.includes("mobile developer") &&
        !resourceCareerPaths.includes("qa engineer")
      ) {
        tier = "TIER_3_SUPPORTING";
        score += 90;
        matchedComp = resourceSkills[0] || "foundational engineering";
        reason = `Provides supporting ${matchedComp} expertise that strengthens your ${params.targetPosition || "career"} profile.`;
        itemEvidence = {
          gapSubjectOverlap: false,
          competencyOverlap: true,
          roleRelevance: true,
          genericKeywordOnly: false,
          matchedConcept: matchedComp,
        };
      } else if (resourceCareerPaths.includes("all tech roles") || resourceCareerPaths.includes("all career paths")) {
        // Universal tech conferences / seminars
        tier = "TIER_3_SUPPORTING";
        score += 85;
        matchedComp = resourceSkills[0] || "tech trends & networking";
        reason = `Industry seminar covering emerging tech trends and professional networking for ${params.targetPosition || "tech professionals"}.`;
        itemEvidence = {
          gapSubjectOverlap: false,
          competencyOverlap: true,
          roleRelevance: true,
          genericKeywordOnly: false,
          matchedConcept: matchedComp,
        };
      } else {
        // ----------------------------------------------------
        // TIER 5: IRRELEVANT / DISJOINT DOMAIN
        // ----------------------------------------------------
        tier = "TIER_5_IRRELEVANT";
        score = -100;
        itemEvidence = {
          gapSubjectOverlap: false,
          competencyOverlap: false,
          roleRelevance: false,
          genericKeywordOnly: false,
        };
      }
    }

    // STRICT RELEVANCE FILTER:
    // Exclude Tier 4 (Generic) and Tier 5 (Irrelevant) from the "For You" feed!
    if (tier === "TIER_1_DIRECT_GAP" || tier === "TIER_2_ROLE_COMPETENCY" || tier === "TIER_3_SUPPORTING") {
      seenUrls.add(normUrl);
      scoredItems.push({
        ...resource,
        relevanceScore: score,
        recommendationReason: reason,
        matchedSkillGap: matchedGapName || "NONE",
        matchedCompetency: matchedComp || "core technical",
        relevanceTier: tier,
        matchEvidence: itemEvidence,
        isPersonalizedGap: tier === "TIER_1_DIRECT_GAP",
      });
    }
  }

  // Sort descending by relevance score (Tier 1 > Tier 2 > Tier 3)
  scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return scoredItems;
}

/**
 * Parameters for generating Growth Path recommendations on the Resume / Dashboard tab.
 */
export interface GrowthPathParams {
  targetPosition?: string;
  degreeProgram?: string;
  activeResume?: any;
  activeAnalysis?: any;
  customCatalog?: LearningResource[];
}

/**
 * Structured Growth Path recommendations partitioned into Certifications, Courses, and Practical Learning.
 */
export interface GrowthPathResult {
  certifications: MatchedResourceItem[];
  courses: MatchedResourceItem[];
  practicalLearning: MatchedResourceItem[];
}

/**
 * Authoritative Growth Path recommendation service for the Resume tab.
 * Dynamically curates up to 5 Certifications, 5 Courses, and 3 Practical Resources
 * strictly matching the user's active target role, identified skill gaps, and deduplicated against the resume.
 */
export function getGrowthPathRecommendations(params: GrowthPathParams): GrowthPathResult {
  const targetPos = params.targetPosition || params.activeAnalysis?.learningSnapshot?.targetPosition || "";
  const rawResumeText = params.activeResume?.rawText || "";
  const structuredData = params.activeResume?.structuredData || {};
  
  const detectedSkills =
    params.activeAnalysis?.detectedSkills ||
    (params.activeResume?.structuredData?.skills || []).map((s: any) =>
      typeof s === "string" ? s : s.name
    );

  const skillGaps = params.activeAnalysis?.learningSnapshot?.skillGaps || [];
  const skillsToLearn = params.activeAnalysis?.learningSnapshot?.skillsToLearn || [];

  const allMatched = matchLearningRecommendations({
    targetPosition: targetPos,
    degreeProgram: params.degreeProgram,
    skillGaps,
    skillsToLearn,
    detectedSkills,
    rawResumeText,
    structuredResumeData: structuredData,
    customCatalog: params.customCatalog,
    categoryId: "for_you",
  });

  const certifications: MatchedResourceItem[] = [];
  const courses: MatchedResourceItem[] = [];
  const practicalLearning: MatchedResourceItem[] = [];

  for (const item of allMatched) {
    if (item.type === "certification") {
      if (certifications.length < 5) {
        certifications.push({
          ...item,
          gapRationale:
            item.recommendationReason ||
            `Industry recognized credential for ${targetPos || "your career"}.`,
        });
      }
    } else if (item.type === "course") {
      if (courses.length < 5) {
        courses.push({
          ...item,
          gapRationale:
            item.recommendationReason ||
            `Addresses key competencies for ${targetPos || "your career"}.`,
        });
      }
    } else if (
      item.type === "video" ||
      item.type === "guide" ||
      item.type === "practice" ||
      item.type === "documentation" ||
      item.type === "seminar" ||
      item.type === "article" ||
      item.type === "example" ||
      item.type === "module"
    ) {
      if (practicalLearning.length < 3) {
        practicalLearning.push({
          ...item,
          gapRationale:
            item.recommendationReason ||
            `Hands-on practical resource to close gaps for ${targetPos || "your career"}.`,
        });
      }
    }
  }

  return {
    certifications,
    courses,
    practicalLearning,
  };
}

/**
 * Forensic diagnostic logger to print the exact contents of the For You page with Match Evidence.
 */
export function logForYouRecommendations(
  user: string,
  targetRole: string,
  gaps: Array<{ skill: string } | string> | undefined,
  items: MatchedResourceItem[]
): void {
  console.log("============================================================");
  console.log("AIRIS - FOR YOU RECOMMENDATIONS");
  console.log("============================================================");
  console.log(`\nUser: ${user}`);
  console.log(`\nTarget Role: ${targetRole || "Not Specified"}\n`);

  console.log("Identified Gaps:");
  if (gaps && gaps.length > 0) {
    gaps.forEach((g) => {
      const gapText = typeof g === "string" ? g : g.skill;
      console.log(`- ${gapText}`);
    });
  } else {
    console.log("- None explicitly recorded");
  }

  console.log("\nRecommendations:\n");
  items.forEach((item, index) => {
    const ev = item.matchEvidence || {
      gapSubjectOverlap: item.relevanceTier === "TIER_1_DIRECT_GAP",
      competencyOverlap: true,
      roleRelevance: true,
      genericKeywordOnly: false,
    };

    console.log(`${index + 1}.`);
    console.log(`Title: ${item.title}`);
    console.log(`Provider: ${item.provider}`);
    console.log(`Type: ${item.type}`);
    console.log(`Link: ${item.url}\n`);

    console.log(`Target Role: ${targetRole || "Not Specified"}`);
    console.log(`Matched Gap: ${item.matchedSkillGap || "NONE"}`);
    console.log(`Matched Competency: ${item.matchedCompetency || "N/A"}\n`);

    console.log(`Relevance Tier: ${item.relevanceTier || "TIER_2_ROLE_COMPETENCY"}\n`);

    console.log("Match Evidence:");
    console.log(`- Gap subject overlap: ${ev.gapSubjectOverlap ? "YES" : "NO"}`);
    console.log(`- Competency overlap: ${ev.competencyOverlap ? "YES" : "NO"}`);
    console.log(`- Role relevance: ${ev.roleRelevance ? "YES" : "NO"}`);
    console.log(`- Generic keyword only: ${ev.genericKeywordOnly ? "YES" : "NO"}\n`);

    console.log(`Reason: ${item.recommendationReason || "N/A"}\n`);
  });
  console.log("============================================================");
  console.log("END FOR YOU RECOMMENDATIONS");
  console.log("============================================================");
}



