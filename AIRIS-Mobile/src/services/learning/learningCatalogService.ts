import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../../config/firebase";
import { DEFAULT_LEARNING_CATEGORIES } from "../../data/learningCategories";
import { VERIFIED_LEARNING_CATALOG } from "../../data/verifiedLearningCatalog";
import {
  AcademicDomainProfile,
  LearningCategory,
  LearningCatalogCache,
  LearningResource,
  MatchedResourceItem,
  MatchEvidence,
  PersonalizedLearningProfile,
  PrimaryLearnCategory,
  RecommendationTier,
  ResourceType,
} from "../../types/learning.types";
import { validateAndSanitizeCatalog, validateLearningResource } from "./catalogValidator";
import { evaluateCareerTargetCompatibility } from "../ai/careerCompatibilityGuardrail";

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

    // 4. Canonical Merge: Firestore is authoritative over local seed catalog
    const resourceMap = new Map<string, LearningResource>();
    for (const seedItem of VERIFIED_LEARNING_CATALOG) {
      resourceMap.set(seedItem.id, seedItem);
    }
    for (const fsItem of firestoreResources) {
      if (fsItem.isActive === false) {
        resourceMap.delete(fsItem.id); // Firestore explicitly deactivated item
      } else {
        resourceMap.set(fsItem.id, fsItem); // Firestore overwrites local seed
      }
    }
    const finalResources = Array.from(resourceMap.values());
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
  {
    id: "civil_engineering",
    name: "Civil & Structural Engineering",
    roleKeywords: [
      "civil engineer",
      "structural engineer",
      "site engineer",
      "construction engineer",
      "civil engineering",
      "civil",
    ],
    coreCompetencies: [
      "staad.pro",
      "structural analysis",
      "autocad",
      "concrete structure design",
      "bim",
      "building information modeling",
      "quantity surveying",
      "construction management",
      "site inspection",
    ],
    supportingDomains: ["architecture", "general_tech"],
  },
  {
    id: "accountancy",
    name: "Accountancy, Audit & Financial Accounting",
    roleKeywords: [
      "accountant",
      "auditor",
      "certified public accountant",
      "cpa",
      "financial accountant",
      "accounting assistant",
      "bookkeeper",
      "accountancy",
    ],
    coreCompetencies: [
      "bookkeeping",
      "internal controls",
      "financial accounting",
      "internal audit",
      "ifrs",
      "gaap",
      "bank reconciliation",
      "journal entries",
      "tax compliance",
      "financial modeling",
      "advanced excel",
    ],
    supportingDomains: ["data_analytics", "general_tech"],
  },
  {
    id: "education_instructional_design",
    name: "Education, Pedagogy & Instructional Design",
    roleKeywords: [
      "instructional designer",
      "educator",
      "teacher",
      "e-learning specialist",
      "curriculum developer",
      "learning designer",
      "education",
    ],
    coreCompetencies: [
      "e-learning authoring tools",
      "articulate storyline",
      "addie",
      "instructional design",
      "curriculum design",
      "multimedia development",
      "learning analytics",
      "accessibility standards",
      "udl",
      "universal design for learning",
      "lesson planning",
    ],
    supportingDomains: ["ui_ux", "general_tech"],
  },
  {
    id: "architecture",
    name: "Architecture & Environmental Design",
    roleKeywords: [
      "architect",
      "architectural designer",
      "bim specialist",
      "draftsman",
      "architecture",
    ],
    coreCompetencies: [
      "revit",
      "autodesk revit",
      "architectural drafting",
      "cad",
      "bim",
      "spatial planning",
      "sustainable building design",
      "leed",
    ],
    supportingDomains: ["civil_engineering", "ui_ux"],
  },
  {
    id: "psychology",
    name: "Psychology & Behavioral Sciences",
    roleKeywords: [
      "psychologist",
      "psychometrician",
      "human behavior specialist",
      "counselor",
      "psychology",
    ],
    coreCompetencies: [
      "psychometrics",
      "psychological assessment",
      "test construction",
      "psychometrician core competency",
      "research methods",
      "statistical analysis",
      "behavioral assessment",
      "cognitive psychology",
    ],
    supportingDomains: ["data_analytics", "general_tech"],
  },
  {
    id: "marketing",
    name: "Marketing & Digital Communications",
    roleKeywords: [
      "marketing specialist",
      "digital marketer",
      "content strategist",
      "seo specialist",
      "social media manager",
      "marketing",
    ],
    coreCompetencies: [
      "digital marketing",
      "seo",
      "content marketing",
      "social media strategy",
      "google analytics",
      "brand management",
      "email marketing",
    ],
    supportingDomains: ["data_analytics", "ui_ux"],
  },
];


export const ACADEMIC_DOMAINS: AcademicDomainProfile[] = [
  {
    id: "cs_it",
    name: "Computer Science & Information Technology",
    domainKeywords: [
      "college of information technology",
      "college of computer studies",
      "college of computing",
      "bsit",
      "bscs",
      "bs data science",
      "bs entertainment and multimedia",
      "information technology",
      "computer science",
      "data science",
      "entertainment and multimedia computing",
      "software engineering",
      "cybersecurity",
    ],
    coreCompetencies: ["programming", "software development", "database management", "web development", "networking", "system administration", "data analysis"],
    primaryCareers: ["software engineer", "full stack developer", "backend developer", "frontend developer", "data analyst", "cybersecurity analyst", "system administrator", "mobile developer", "qa engineer", "game developer"],
  },
  {
    id: "computer_eng",
    name: "Computer Engineering & Hardware Systems",
    domainKeywords: [
      "bs computer engineering",
      "computer engineering",
      "bscpe",
      "embedded systems",
      "microcontrollers",
    ],
    coreCompetencies: ["embedded systems", "microcontrollers", "c++", "hardware interfacing", "computer architecture", "digital logic", "circuit design"],
    primaryCareers: ["computer engineer", "embedded software engineer", "hardware engineer", "firmware engineer", "network architect", "iot solutions architect"],
  },
  {
    id: "civil_eng",
    name: "Civil & Structural Engineering",
    domainKeywords: [
      "bs civil engineering",
      "bsce",
      "civil engineering",
      "structural engineering",
      "construction engineering",
      "geotechnical engineering",
      "sanitary engineering",
      "transportation engineering",
    ],
    coreCompetencies: ["structural analysis", "autocad", "staad.pro", "construction management", "quantity surveying", "materials engineering", "fluid mechanics", "geotechnical analysis", "reinforced concrete design", "steel design"],
    primaryCareers: ["civil engineer", "structural engineer", "construction manager", "site engineer", "quantity surveyor", "geotechnical engineer"],
  },
  {
    id: "mechanical_eng",
    name: "Mechanical Engineering & Energy Systems",
    domainKeywords: [
      "bs mechanical engineering",
      "bsme",
      "mechanical engineering",
      "thermodynamics",
      "hvac",
      "machine design",
      "robotics",
    ],
    coreCompetencies: ["thermodynamics", "fluid mechanics", "machine design", "hvac", "solidworks", "cad", "manufacturing processes", "heat transfer", "plc automation"],
    primaryCareers: ["mechanical engineer", "mechanical design engineer", "hvac engineer", "automotive engineer", "manufacturing engineer", "power plant engineer"],
  },
  {
    id: "electrical_eng",
    name: "Electrical Engineering & Power Systems",
    domainKeywords: [
      "bs electrical engineering",
      "bsee",
      "electrical engineering",
      "power systems",
      "high voltage",
      "substation",
    ],
    coreCompetencies: ["circuit analysis", "power systems", "etap", "electrical design", "control systems", "philippine electrical code", "matlab", "substation design"],
    primaryCareers: ["electrical engineer", "electrical design engineer", "power systems engineer", "control systems engineer", "substation engineer"],
  },
  {
    id: "electronics_eng",
    name: "Electronics & Communications Engineering",
    domainKeywords: [
      "bs electronics engineering",
      "bsece",
      "electronics engineering",
      "telecommunications",
      "rf engineering",
      "signal processing",
    ],
    coreCompetencies: ["electronics", "telecommunications", "networking", "ccna", "embedded systems", "signal processing", "microelectronics", "pcb design"],
    primaryCareers: ["electronics engineer", "telecommunications engineer", "network engineer", "embedded systems engineer", "signal processing engineer"],
  },
  {
    id: "industrial_eng",
    name: "Industrial Engineering & Operations Research",
    domainKeywords: [
      "bs industrial engineering",
      "bsie",
      "industrial engineering",
      "ergonomics",
      "operations research",
      "quality engineering",
    ],
    coreCompetencies: ["process optimization", "lean six sigma", "ergonomics", "operations research", "supply chain analytics", "statistical quality control", "simio simulation"],
    primaryCareers: ["industrial engineer", "process improvement engineer", "production planner", "quality assurance engineer", "supply chain analyst"],
  },
  {
    id: "chemical_eng",
    name: "Chemical Engineering & Process Design",
    domainKeywords: [
      "bs chemical engineering",
      "bsche",
      "chemical engineering",
      "unit operations",
      "reaction engineering",
      "process safety",
    ],
    coreCompetencies: ["chemical reaction engineering", "unit operations", "mass transfer", "process safety", "aspen plus", "analytical chemistry", "quality control"],
    primaryCareers: ["chemical engineer", "process engineer", "plant engineer", "quality control engineer", "materials engineer"],
  },
  {
    id: "architecture",
    name: "Architecture & Built Environment",
    domainKeywords: [
      "bs architecture",
      "bsarch",
      "architecture",
      "building design",
      "urban planning",
      "interior design",
    ],
    coreCompetencies: ["architectural design", "building information modeling", "revit", "autocad", "building codes", "sketchup", "lumion", "spatial planning", "leed"],
    primaryCareers: ["architect", "design architect", "project architect", "cad/bim specialist", "urban planner", "interior designer"],
  },
  {
    id: "cba_accounting",
    name: "Accountancy & Accounting Information Systems",
    domainKeywords: [
      "bs accountancy",
      "bs accounting information system",
      "bsa",
      "bsais",
      "accountancy",
      "auditing",
      "taxation",
    ],
    coreCompetencies: ["financial accounting", "financial audit", "taxation", "ifrs", "pfrs", "internal controls", "quickbooks", "cost accounting", "bookkeeping"],
    primaryCareers: ["accountant", "certified public accountant", "auditor", "tax consultant", "accounting systems analyst", "financial controller"],
  },
  {
    id: "business_finance",
    name: "Financial Management & Corporate Finance",
    domainKeywords: [
      "bsba major in financial management",
      "financial management",
      "corporate finance",
      "investment analysis",
      "treasury",
    ],
    coreCompetencies: ["financial modeling", "investment analysis", "corporate finance", "excel", "credit analysis", "risk management", "dcf valuation"],
    primaryCareers: ["financial analyst", "investment analyst", "credit analyst", "banking associate", "treasury analyst", "risk analyst"],
  },
  {
    id: "business_mgmt",
    name: "Business Administration & Management",
    domainKeywords: [
      "bsba major in human resource management",
      "bsba major in logistics and supply chain management",
      "bsba major in marketing management",
      "bs business administration",
      "bsba",
      "human resource management",
      "logistics",
      "marketing management",
    ],
    coreCompetencies: ["talent acquisition", "hr analytics", "supply chain management", "logistics", "digital marketing", "seo", "brand management", "business analytics"],
    primaryCareers: ["hr specialist", "talent acquisition specialist", "supply chain analyst", "logistics coordinator", "marketing specialist", "brand associate", "business analyst"],
  },
  {
    id: "arts_psychology",
    name: "Psychology & Behavioral Sciences",
    domainKeywords: [
      "bachelor of arts in psychology",
      "bs psychology",
      "ba psychology",
      "psychology",
      "behavioral science",
      "psychometrics",
    ],
    coreCompetencies: ["psychological testing", "psychometrics", "test construction", "spss", "statistical analysis", "counseling", "abnormal psychology", "behavioral assessment"],
    primaryCareers: ["psychometrician", "psychologist", "hr recruitment associate", "guidance associate", "behavioral research assistant"],
  },
  {
    id: "education",
    name: "Education & Instructional Design",
    domainKeywords: [
      "college of education",
      "bsed",
      "beed",
      "education",
      "instructional design",
      "pedagogy",
      "curriculum development",
    ],
    coreCompetencies: ["learning pedagogy", "instructional design", "curriculum development", "educational assessment", "classroom management", "addie model", "e-learning development"],
    primaryCareers: ["teacher", "educator", "instructional designer", "curriculum developer", "e-learning specialist", "educational consultant"],
  },
  {
    id: "shs_stem",
    name: "STEM Senior High Strand",
    domainKeywords: [
      "stem strand",
      "science, technology, engineering, and mathematics",
      "shs stem",
    ],
    coreCompetencies: ["pre-calculus", "general physics", "general chemistry", "engineering fundamentals", "basic programming", "scientific inquiry"],
    primaryCareers: ["engineering student assistant", "junior software developer", "data analyst intern", "cad trainee"],
  },
  {
    id: "shs_abm",
    name: "ABM Senior High Strand",
    domainKeywords: [
      "abm strand",
      "accountancy, business, and management",
      "shs abm",
    ],
    coreCompetencies: ["basic bookkeeping", "business math", "organization and management", "principles of marketing", "excel fundamentals"],
    primaryCareers: ["junior bookkeeper", "marketing assistant", "administrative assistant", "hr assistant"],
  },
  {
    id: "shs_humss",
    name: "HUMSS Senior High Strand",
    domainKeywords: [
      "humss strand",
      "humanities and social sciences",
      "shs humss",
    ],
    coreCompetencies: ["academic writing", "creative writing", "public speaking", "media literacy", "social sciences", "community engagement"],
    primaryCareers: ["content writer", "public relations assistant", "communications assistant"],
  },
  {
    id: "shs_gas_tvl",
    name: "GAS & TVL Senior High Strands",
    domainKeywords: [
      "gas strand",
      "tvl strand",
      "general academic strand",
      "technical-vocational-livelihood",
      "shs gas",
      "shs tvl",
    ],
    coreCompetencies: ["it support fundamentals", "pc assembly", "administrative support", "customer service", "technical skills"],
    primaryCareers: ["it support technician", "multimedia assistant", "administrative associate", "customer service representative"],
  },
];

/**
 * Resolves academic domain metadata from student College, Department, and Degree Program inputs.
 */
export function resolveAcademicDomain(
  collegeDomain?: string,
  degreeProgram?: string,
  department?: string
): AcademicDomainProfile | null {
  const combined = `${collegeDomain || ""} ${degreeProgram || ""} ${department || ""}`.toLowerCase().trim();
  if (!combined) return null;

  let bestMatch: AcademicDomainProfile | null = null;
  let bestScore = 0;

  for (const domain of ACADEMIC_DOMAINS) {
    let score = 0;
    for (const kw of domain.domainKeywords) {
      if (combined.includes(kw)) {
        score += kw.length > 5 ? 50 : 20;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = domain;
    }
  }

  if (bestMatch && bestScore > 0) return bestMatch;

  const tokens = combined.split(/\s+/).filter((t) => t.length >= 3 && !GENERIC_TECHNOLOGY_WORDS.has(t));
  if (tokens.length === 0) return null;

  return {
    id: tokens[0],
    name: degreeProgram || collegeDomain || "Academic Program",
    domainKeywords: tokens,
    coreCompetencies: tokens,
    primaryCareers: [],
  };
}

/**
 * Synthesizes complete user learning context into a unified PersonalizedLearningProfile.
 */
export function buildPersonalizedLearningProfile(params: RecommendationMatchParams): PersonalizedLearningProfile {
  const targetPos = (params.targetPosition || "").trim();
  const degreeProg = (params.degreeProgram || "").trim();
  const colDomain = (params.collegeDomain || "").trim();
  const dept = (params.department || "").trim();

  const academicDomain = resolveAcademicDomain(colDomain, degreeProg, dept);
  const userDomains = resolveCareerDomains(targetPos);
  const careerDomain = userDomains.length > 0 ? userDomains[0] : null;

  let compatibility: "ALIGNED" | "PIVOT" | "DISTANT" = params.compatibilityClassification || "ALIGNED";
  if (!params.compatibilityClassification && degreeProg && targetPos) {
    const compRes = evaluateCareerTargetCompatibility(degreeProg, targetPos);
    compatibility = compRes.classification;
  }

  const resumeProfile = extractResumeCredentialProfile(
    params.rawResumeText,
    params.structuredResumeData,
    params.detectedSkills
  );

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

  return {
    academicDomain,
    careerDomain,
    compatibility,
    targetPosition: targetPos,
    degreeProgram: degreeProg,
    collegeDomain: colDomain,
    department: dept,
    resumeProfile,
    normalizedGaps,
  };
}

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
  if (matchedDomains.length > 0) {
    return matchedDomains.map((m) => m.domain);
  }

  // Dynamic domain profile resolution for unindexed valid professional roles
  const cleanTokens = targetLower.split(" ").filter((t) => t.length >= 3 && !GENERIC_TECHNOLOGY_WORDS.has(t));
  return [
    {
      id: targetLower.replace(/[^a-z0-9_]/g, "_"),
      name: targetRole.trim(),
      roleKeywords: [targetLower, ...cleanTokens],
      coreCompetencies: cleanTokens,
      supportingDomains: ["general_tech"],
    },
  ];
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
  "learning",
  "authoring",
  "pro",
  "control",
  "controls",
  "structure",
  "structures",
  "computer",
  "science",
  "general",
  "digital",
  "media",
  "multimedia",
  "content",
  "compliance",
  "assessment",
  "evaluation",
  "governance",
  "strategy",
  "strategies",
  "practice",
  "practices",
  "training",
  "trainings",
  "course",
  "courses",
  "certification",
  "certifications",
  "foundation",
  "foundations",
  "intro",
  "handbook",
  "cs50",
  "talks",
  "summit",
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
  if (normalized.includes("staad") || normalized.includes("structural analysis") || normalized.includes("structural engineering")) {
    substantiveConcepts.push("staad.pro", "structural analysis", "bentley staad", "structural engineering");
  }
  if (normalized.includes("concrete") || normalized.includes("structure design") || normalized.includes("reinforced concrete")) {
    substantiveConcepts.push("concrete structure design", "reinforced concrete", "structural design");
  }
  if (normalized.includes("bim") || normalized.includes("revit") || normalized.includes("building information")) {
    substantiveConcepts.push("bim", "building information modeling", "revit");
  }
  if (normalized.includes("bookkeeping") || normalized.includes("ledger") || normalized.includes("double entry")) {
    substantiveConcepts.push("bookkeeping", "financial accounting", "journal entries");
  }
  if (normalized.includes("internal control") || normalized.includes("internal audit") || normalized.includes("coso")) {
    substantiveConcepts.push("internal controls", "internal audit", "financial controls");
  }
  if (normalized.includes("advanced excel") || normalized.includes("financial modeling") || normalized.includes("pivot table")) {
    substantiveConcepts.push("advanced excel", "financial modeling", "excel");
  }
  if (normalized.includes("authoring tool") || normalized.includes("articulate") || normalized.includes("storyline") || normalized.includes("elearning")) {
    substantiveConcepts.push("e-learning authoring tools", "articulate storyline", "e-learning development");
  }
  if (normalized.includes("addie") || normalized.includes("instructional design") || normalized.includes("curriculum")) {
    substantiveConcepts.push("instructional design", "addie", "curriculum design");
  }
  if (normalized.includes("accessibility") || normalized.includes("udl") || normalized.includes("universal design")) {
    substantiveConcepts.push("accessibility standards", "udl", "universal design for learning");
  }
  if (normalized.includes("multimedia") || normalized.includes("video production") || normalized.includes("content creation")) {
    substantiveConcepts.push("multimedia development", "digital media", "educational video");
  }
  if (normalized.includes("psychometric") || normalized.includes("testing") || normalized.includes("assessment") || normalized.includes("blep") || normalized.includes("psychology")) {
    substantiveConcepts.push("psychometrics", "psychological assessment", "test construction", "statistical analysis", "psychometrician core competency");
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

  const isDomainDirectMatch =
    !userPrimaryDomain ||
    resourceDomainIds.includes(userPrimaryDomain.id) ||
    resourceDomainIds.some((id) => (userPrimaryDomain.supportingDomains || []).includes(id));

  const isRoleRelevant =
    isDomainDirectMatch ||
    resourceCareerPaths.includes("all tech roles") ||
    resourceCareerPaths.includes("all career paths");

  // Check 1: Substantive Domain Concept Match
  const substantiveConcepts = gap.substantiveConcepts || [gap.raw.toLowerCase()];
  for (const concept of substantiveConcepts) {
    if (GENERIC_TECHNOLOGY_WORDS.has(concept) || concept.length < 4) continue;

    // Check resource declared skills with exact equality or robust compound inclusion
    for (const skill of resourceSkills) {
      if (GENERIC_TECHNOLOGY_WORDS.has(skill) && !(concept.includes(skill) || skill.includes(concept))) continue;

      const isExactMatch = skill === concept;
      const isCompoundMatch =
        (concept === "time series forecasting" && (skill === "time series forecasting" || skill === "time series analysis" || skill === "forecasting" || skill === "arima")) ||
        (concept === "sql performance tuning" && (skill === "sql performance tuning" || skill === "query optimization" || skill === "database indexing" || skill === "execution plans" || skill === "performance tuning")) ||
        (concept === "data governance" && (skill === "data governance" || skill === "data privacy" || skill === "gdpr" || skill === "data protection" || skill === "data stewardship" || skill === "dataplex")) ||
        (concept === "cloud data warehousing" && (skill === "cloud data warehousing" || skill === "data warehouse" || skill === "bigquery" || skill === "snowflake")) ||
        (concept === "predictive modeling" && (skill === "predictive modeling" || skill === "scikit-learn" || skill === "machine learning")) ||
        (concept === "data visualization" && (skill === "data visualization" || skill === "power bi" || skill === "tableau")) ||
        (concept === "network security" && (skill === "network security" || skill === "threat analysis" || skill === "siem" || skill === "splunk" || skill === "wireshark")) ||
        (concept.includes("psychometric") && (skill.includes("psychometrics") || skill.includes("psychological assessment") || skill.includes("test construction"))) ||
        (concept.includes("staad") && (skill.includes("structural analysis") || skill.includes("staad.pro") || skill.includes("concrete"))) ||
        (concept.includes("authoring") && (skill.includes("e-learning authoring tools") || skill.includes("articulate storyline"))) ||
        (concept.includes("audit") && (skill.includes("internal audit") || skill.includes("internal controls") || skill.includes("bookkeeping"))) ||
        ((concept.includes("python") || concept === "programming in python") && (skill === "python" || skill === "python programming" || skill === "python development"));

      if (isExactMatch || isCompoundMatch) {
        return {
          isMatch: true,
          isDirectGap: isDomainDirectMatch,
          matchScore: isDomainDirectMatch ? 500 : 250,
          matchedConcept: skill,
          evidence: {
            gapSubjectOverlap: true,
            competencyOverlap: true,
            roleRelevance: isDomainDirectMatch,
            genericKeywordOnly: false,
            matchedConcept: skill,
          },
        };
      }
    }

    // Check subskills
    const resourceSubskills = (resource.subskills || []).map((s) => s.toLowerCase().trim());
    if (resourceSubskills.some((s) => !GENERIC_TECHNOLOGY_WORDS.has(s) && (s === concept || (concept.length >= 6 && (concept.includes(s) || s.includes(concept)))))) {
      return {
        isMatch: true,
        isDirectGap: isDomainDirectMatch,
        matchScore: isDomainDirectMatch ? 450 : 220,
        matchedConcept: concept,
        evidence: {
          gapSubjectOverlap: true,
          subskillOverlap: true,
          competencyOverlap: true,
          roleRelevance: isDomainDirectMatch,
          genericKeywordOnly: false,
          matchedConcept: concept,
        },
      };
    }

    // Check title (Requires exact phrase match or non-generic concept >= 8 chars)
    if (
      !GENERIC_TECHNOLOGY_WORDS.has(concept) &&
      concept.length >= 8 &&
      concept.includes(" ") &&
      resourceTitleLower.includes(concept)
    ) {
      return {
        isMatch: true,
        isDirectGap: isDomainDirectMatch,
        matchScore: isDomainDirectMatch ? 450 : 200,
        matchedConcept: concept,
        evidence: {
          gapSubjectOverlap: true,
          competencyOverlap: true,
          roleRelevance: isDomainDirectMatch,
          genericKeywordOnly: false,
          matchedConcept: concept,
        },
      };
    }

    // Check tags
    if (resourceTags.some((t) => !GENERIC_TECHNOLOGY_WORDS.has(t) && t === concept)) {
      return {
        isMatch: true,
        isDirectGap: isDomainDirectMatch,
        matchScore: isDomainDirectMatch ? 400 : 180,
        matchedConcept: concept,
        evidence: {
          gapSubjectOverlap: true,
          competencyOverlap: true,
          roleRelevance: isDomainDirectMatch,
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
  collegeDomain?: string;
  department?: string;
  compatibilityClassification?: "ALIGNED" | "PIVOT" | "DISTANT";
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

  // Build unified multi-context Personalized Learning Profile
  const userProfile = buildPersonalizedLearningProfile(params);
  const { academicDomain, careerDomain, compatibility, normalizedGaps, resumeProfile } = userProfile;
  const primaryDomain = careerDomain;
  const primaryDomainId = primaryDomain ? primaryDomain.id : null;
  const supportingDomainIds = primaryDomain ? primaryDomain.supportingDomains : [];

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

  // 2. PERSONALIZED CATEGORIES (For You, Certifications, Courses, Practical Learning)
  const seenUrls = new Set<string>();
  const scoredItems: MatchedResourceItem[] = [];

  for (const resource of catalog) {
    if (!resource.isActive) continue;
    if (!validateLearningResource(resource)) continue;

    // Filter by specific category if requested
    if (params.categoryId && params.categoryId !== "for_you") {
      if (resource.category !== params.categoryId) {
        continue;
      }
    } else if (params.categoryId === "for_you" || !params.categoryId) {
      if (
        resource.category === "interviews" ||
        resource.category === "resume" ||
        resource.category === "communication"
      ) {
        continue;
      }
    }

    // Filter by resource type if requested
    if (resourceType !== "all" && resource.type !== resourceType) {
      continue;
    }

    // Deduplicate credentials/courses already present in resume
    const dedupeCheck = isResourceAlreadyInResume(resource, resumeProfile);
    if (dedupeCheck.isDuplicate) {
      continue;
    }

    // Demote basic tutorials if skill is already demonstrated without a gap
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
      score -= 50;
    }

    // Academic Domain Boost: If resource matches candidate's academic degree/domain
    if (academicDomain && resourceDomains.some((d) => d.id === academicDomain.id)) {
      score += 15;
    }

    let reason = "";
    let itemEvidence: MatchEvidence = {
      gapSubjectOverlap: false,
      competencyOverlap: false,
      roleRelevance: false,
      genericKeywordOnly: false,
    };

    // TIER 1: DIRECT RESUME SKILL GAP MATCH
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

      if (compatibility === "PIVOT" && params.degreeProgram) {
        reason = `As a ${params.degreeProgram} student pivoting to ${params.targetPosition || "your target role"}, directly addresses your gap in "${matchedGapName}".`;
      } else if (compatibility === "DISTANT" && params.degreeProgram) {
        reason = `Essential foundational course in "${matchedGapName}" for transitioning from ${params.degreeProgram} to ${params.targetPosition || "your target role"}.`;
      } else {
        reason = `Directly addresses your identified gap in "${matchedGapName}" by developing ${matchedComp} for ${params.targetPosition || "your target role"}.`;
      }
    } else {
      // TIER 2: DIRECT TARGET ROLE CORE COMPETENCY OR ACADEMIC PROGRAM MATCH
      const isDirectCareerPathMatch = targetPos && resourceCareerPaths.some(
        (cp) => {
          const cpLower = cp.toLowerCase().trim();
          const targetLower = targetPos.toLowerCase().trim();
          if (cpLower === targetLower) return true;
          
          // Ambiguous career path disambiguation: "architect" for BS Architecture should NOT match cloud/software/solutions architect
          if (targetLower === "architect" || targetLower === "architectural designer") {
            if (cpLower.includes("cloud") || cpLower.includes("software") || cpLower.includes("systems") || cpLower.includes("solutions") || cpLower.includes("enterprise") || cpLower.includes("devops")) {
              return false;
            }
          }
          return cpLower.includes(targetLower) || targetLower.includes(cpLower);
        }
      );
      const isAcademicProgramMatch = !!(params.degreeProgram && (resource.academicPrograms || []).some(
        (ap) => {
          const apLower = ap.toLowerCase().trim();
          const degLower = (params.degreeProgram || "").toLowerCase().trim();
          return apLower === degLower || apLower.includes(degLower) || degLower.includes(apLower);
        }
      ));
      const isDomainMatch = (primaryDomainId && resourceDomainIds.includes(primaryDomainId)) || (academicDomain && resourceDomainIds.includes(academicDomain.id));
      const hasCoreCompetencyOverlap = (primaryDomain && resourceSkills.some((s) => primaryDomain.coreCompetencies.includes(s))) || (academicDomain && resourceSkills.some((s) => academicDomain.coreCompetencies.includes(s)));

      if (isDirectCareerPathMatch || isAcademicProgramMatch || (isDomainMatch && hasCoreCompetencyOverlap)) {
        tier = "TIER_2_ROLE_COMPETENCY";
        score += 200;
        matchedComp = resourceSkills.find((s) => primaryDomain?.coreCompetencies.includes(s)) || resourceSkills[0] || "core technical";
        
        if (compatibility === "PIVOT" && params.degreeProgram) {
          reason = `Builds core ${matchedComp} competencies for ${params.targetPosition || "your target role"}, bridging your ${params.degreeProgram} background.`;
        } else {
          reason = `Develops core ${matchedComp} competencies essential for ${params.targetPosition || "your target role"} roles.`;
        }
        itemEvidence = {
          gapSubjectOverlap: false,
          competencyOverlap: true,
          roleRelevance: true,
          genericKeywordOnly: false,
          matchedConcept: matchedComp,
        };
      } else if (
        // TIER 3: SUPPORTING COMPETENCY / OVERLAPPING DOMAIN
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
        const hasNoUserContext = !targetPos && normalizedGaps.length === 0;
        const isDomainRelevant = primaryDomain
          ? resourceDomainIds.includes(primaryDomain.id) ||
            resourceSkills.some((s) => primaryDomain.coreCompetencies.includes(s))
          : true;

        if (hasNoUserContext || isDomainRelevant) {
          tier = "TIER_3_SUPPORTING";
          score += 85;
          matchedComp = resourceSkills[0] || "professional readiness";
          reason = `Supporting professional resource covering ${matchedComp} for ${params.targetPosition || "your career track"}.`;
          itemEvidence = {
            gapSubjectOverlap: false,
            competencyOverlap: true,
            roleRelevance: true,
            genericKeywordOnly: false,
            matchedConcept: matchedComp,
          };
        } else {
          tier = "TIER_5_IRRELEVANT";
          score = -100;
        }
      } else {
        tier = "TIER_5_IRRELEVANT";
        score = -100;
      }
    }

    const isCategoryTab = params.categoryId && params.categoryId !== "for_you";
    if (isCategoryTab || tier === "TIER_1_DIRECT_GAP" || tier === "TIER_2_ROLE_COMPETENCY" || tier === "TIER_3_SUPPORTING") {
      if (!reason && isCategoryTab) {
        const firstSkill = (resource.skills && resource.skills[0]) || resource.title;
        reason = `Prepares for ${params.targetPosition || "target role"} competencies by covering ${firstSkill}.`;
      }

      seenUrls.add(normUrl);
      scoredItems.push({
        ...resource,
        relevanceScore: score > 0 ? score : 50,
        recommendationReason: reason || resource.description,
        matchedSkillGap: matchedGapName || "NONE",
        matchedCompetency: matchedComp || "core technical",
        relevanceTier: tier === "TIER_5_IRRELEVANT" ? "TIER_3_SUPPORTING" : tier,
        matchEvidence: itemEvidence,
        isPersonalizedGap: tier === "TIER_1_DIRECT_GAP",
      });
    }
  }

  // Sort raw items by relevance score
  scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // MULTI-COMPETENCY SLOT ALLOCATION (Prevent Single-Gap Dominance)
  if (normalizedGaps.length >= 2) {
    const tier1Items = scoredItems.filter((i) => i.relevanceTier === "TIER_1_DIRECT_GAP");
    const otherItems = scoredItems.filter((i) => i.relevanceTier !== "TIER_1_DIRECT_GAP");

    if (tier1Items.length > 0) {
      const gapBuckets = new Map<string, MatchedResourceItem[]>();
      for (const item of tier1Items) {
        const gapKey = (item.matchedSkillGap || "DEFAULT").toLowerCase().trim();
        if (!gapBuckets.has(gapKey)) {
          gapBuckets.set(gapKey, []);
        }
        gapBuckets.get(gapKey)!.push(item);
      }

      const balancedTier1: MatchedResourceItem[] = [];
      const MAX_PER_GAP = 2; // Cap per gap to guarantee multi-gap distribution

      // Round-robin selection across distinct gaps
      let addedInRound = true;
      let roundCount = 0;
      while (addedInRound && roundCount < MAX_PER_GAP) {
        addedInRound = false;
        roundCount++;
        for (const [_, items] of gapBuckets) {
          if (items.length >= roundCount) {
            balancedTier1.push(items[roundCount - 1]);
            addedInRound = true;
          }
        }
      }

      // Add remaining Tier 1 items that were capped
      const balancedIds = new Set(balancedTier1.map((i) => i.id));
      const remainingTier1 = tier1Items.filter((i) => !balancedIds.has(i.id));

      return [...balancedTier1, ...otherItems, ...remainingTier1];
    }
  }

  return scoredItems;
}

/**
 * Parameters for generating Growth Path recommendations on the Resume / Dashboard tab.
 */
export interface GrowthPathParams {
  targetPosition?: string;
  degreeProgram?: string;
  collegeDomain?: string;
  department?: string;
  compatibilityClassification?: "ALIGNED" | "PIVOT" | "DISTANT";
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
    collegeDomain: params.collegeDomain,
    department: params.department,
    compatibilityClassification: params.compatibilityClassification,
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
  const globalSeenIds = new Set<string>();

  const gapsCount = Math.max(skillGaps.length, skillsToLearn.length);
  const maxCerts = gapsCount === 0 ? 3 : Math.min(gapsCount + 1, 5);
  const maxCourses = gapsCount === 0 ? 3 : Math.min(gapsCount + 2, 5);
  const maxPractice = gapsCount === 0 ? 3 : Math.min(gapsCount + 1, 5);

  const certProviders = new Map<string, number>();
  const courseProviders = new Map<string, number>();
  const practiceProviders = new Map<string, number>();

  for (const item of allMatched) {
    if (globalSeenIds.has(item.id)) continue;
    if (item.relevanceTier === "TIER_5_IRRELEVANT") continue;

    const providerNorm = (item.provider || "unknown").toLowerCase().trim();

    if (item.type === "certification") {
      const pCount = certProviders.get(providerNorm) || 0;
      if (certifications.length < maxCerts && pCount < 2) {
        globalSeenIds.add(item.id);
        certProviders.set(providerNorm, pCount + 1);
        certifications.push({
          ...item,
          gapRationale:
            item.recommendationReason ||
            `Industry recognized credential for ${targetPos || "your career"}.`,
        });
      }
    } else if (item.type === "course") {
      const pCount = courseProviders.get(providerNorm) || 0;
      if (courses.length < maxCourses && pCount < 2) {
        globalSeenIds.add(item.id);
        courseProviders.set(providerNorm, pCount + 1);
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
      const pCount = practiceProviders.get(providerNorm) || 0;
      if (practicalLearning.length < maxPractice && pCount < 2) {
        globalSeenIds.add(item.id);
        practiceProviders.set(providerNorm, pCount + 1);
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



