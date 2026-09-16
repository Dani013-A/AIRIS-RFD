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
    id: "sysadmin_it",
    name: "Information Technology & Systems Administration",
    roleKeywords: [
      "information technology specialist",
      "it specialist",
      "system administrator",
      "sysadmin",
      "network administrator",
      "it support specialist",
      "it infrastructure",
      "it technician",
      "it support technician",
      "computer systems servicing technician",
      "computer systems servicing",
      "helpdesk technician",
      "pc technician",
      "hardware technician",
      "technical support specialist",
      "hardware support technician",
      "network specialist",
      "information technology",
    ],
    coreCompetencies: [
      "networking",
      "ccna",
      "cisco ios",
      "routing and switching",
      "network administration",
      "system administration",
      "linux",
      "active directory",
      "it support fundamentals",
      "computer hardware",
      "pc assembly",
      "hardware diagnostics",
      "hardware troubleshooting",
      "troubleshooting",
      "cloud computing",
      "cybersecurity",
    ],
    supportingDomains: ["cloud_devops", "cybersecurity", "software_engineering", "general_tech"],
  },
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
    supportingDomains: ["ui_ux"],
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
      "tvl-ict",
      "tvl ict",
      "ict track",
      "computer systems servicing",
    ],
    coreCompetencies: [
      "it support fundamentals",
      "computer hardware",
      "pc assembly",
      "hardware diagnostics",
      "troubleshooting",
      "administrative support",
      "customer service",
      "technical skills",
    ],
    primaryCareers: [
      "it support technician",
      "computer systems servicing technician",
      "multimedia assistant",
      "administrative associate",
      "customer service representative",
    ],
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

export const CAREER_MODIFIER_WORDS = new Set([
  "junior",
  "senior",
  "associate",
  "specialist",
  "intern",
  "trainee",
  "lead",
  "entry",
  "level",
  "assistant",
  "staff",
  "principal",
]);

/**
 * Normalizes a career title into core substantive tokens, stripping modifier prefixes/suffixes.
 */
export function getCareerTitleTokens(title: string): string[] {
  return (title || "")
    .toLowerCase()
    .trim()
    .split(/[\s/\\-]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 2 && !CAREER_MODIFIER_WORDS.has(t));
}

// Known compound acronyms to protect before splitting slashes
const PROTECTED_ACRONYMS: Record<string, string> = {
  "ci/cd": "__CI_CD__",
  "tcp/ip": "__TCP_IP__",
  "ui/ux": "__UI_UX__",
  "pl/sql": "__PL_SQL__",
  "c/c++": "__C_CPP__",
  "i/o": "__IO__",
};

export interface ToolOntology {
  canonical: string;
  parentConcept?: string;
  isBroadDiscipline?: boolean;
}

export const CANONICAL_TOOL_MAP: Record<string, ToolOntology> = {
  // Databases (Relational & NoSQL)
  "postgresql": { canonical: "PostgreSQL", parentConcept: "sql" },
  "postgres": { canonical: "PostgreSQL", parentConcept: "sql" },
  "mysql": { canonical: "MySQL", parentConcept: "sql" },
  "sqlite": { canonical: "SQLite", parentConcept: "sql" },
  "mariadb": { canonical: "MariaDB", parentConcept: "sql" },
  "mongodb": { canonical: "MongoDB", parentConcept: "nosql" },
  "cassandra": { canonical: "Cassandra", parentConcept: "nosql" },
  "dynamodb": { canonical: "DynamoDB", parentConcept: "nosql" },
  "redis": { canonical: "Redis", parentConcept: "nosql" },
  "sql": { canonical: "SQL", isBroadDiscipline: true },
  "nosql": { canonical: "NoSQL", isBroadDiscipline: true },
  "database management": { canonical: "database management", isBroadDiscipline: true },
  "databases": { canonical: "database management", isBroadDiscipline: true },

  // Containers & Orchestration
  "docker": { canonical: "Docker", parentConcept: "containerization" },
  "containerization": { canonical: "containerization", isBroadDiscipline: true },
  "containers": { canonical: "containerization", isBroadDiscipline: true },
  "kubernetes": { canonical: "Kubernetes", parentConcept: "orchestration" },
  "k8s": { canonical: "Kubernetes", parentConcept: "orchestration" },
  "orchestration": { canonical: "orchestration", isBroadDiscipline: true },

  // Infrastructure Automation & Configuration Management
  "ansible": { canonical: "Ansible", parentConcept: "infrastructure automation" },
  "terraform": { canonical: "Terraform", parentConcept: "infrastructure automation" },
  "puppet": { canonical: "Puppet", parentConcept: "infrastructure automation" },
  "chef": { canonical: "Chef", parentConcept: "infrastructure automation" },
  "infrastructure automation": { canonical: "infrastructure automation", isBroadDiscipline: true },
  "automation": { canonical: "automation", isBroadDiscipline: true },

  // Systems, Networks & Administration
  "powershell": { canonical: "PowerShell", parentConcept: "system administration" },
  "bash": { canonical: "Bash", parentConcept: "system administration" },
  "shell scripting": { canonical: "Shell Scripting", parentConcept: "system administration" },
  "linux": { canonical: "Linux", parentConcept: "system administration" },
  "active directory": { canonical: "Active Directory", parentConcept: "system administration" },
  "windows server": { canonical: "Windows Server", parentConcept: "system administration" },
  "system administration": { canonical: "system administration", isBroadDiscipline: true },
  "it infrastructure": { canonical: "it infrastructure", isBroadDiscipline: true },
  "network administration": { canonical: "network administration", isBroadDiscipline: true },
  "networking": { canonical: "networking", isBroadDiscipline: true },
  "ccna": { canonical: "CCNA", parentConcept: "network administration" },
  "cisco": { canonical: "Cisco", parentConcept: "network administration" },
  "vmware": { canonical: "VMware", parentConcept: "virtualization" },
  "virtualization": { canonical: "virtualization", isBroadDiscipline: true },
  "itil": { canonical: "ITIL", parentConcept: "it service management" },
  "it service management": { canonical: "it service management", isBroadDiscipline: true },

  // Testing & Quality Assurance
  "cypress": { canonical: "Cypress", parentConcept: "qa testing" },
  "selenium": { canonical: "Selenium", parentConcept: "qa testing" },
  "qa testing": { canonical: "qa testing", isBroadDiscipline: true },
  "end-to-end testing": { canonical: "qa testing", isBroadDiscipline: true },

  // Data Science & Machine Learning
  "pandas": { canonical: "Pandas", parentConcept: "data analytics" },
  "numpy": { canonical: "NumPy", parentConcept: "data analytics" },
  "scikit-learn": { canonical: "Scikit-Learn", parentConcept: "machine learning" },
  "sklearn": { canonical: "Scikit-Learn", parentConcept: "machine learning" },
  "tensorflow": { canonical: "TensorFlow", parentConcept: "machine learning" },
  "pytorch": { canonical: "PyTorch", parentConcept: "machine learning" },
  "machine learning": { canonical: "machine learning", isBroadDiscipline: true },
  "deep learning": { canonical: "deep learning", isBroadDiscipline: true },
  "data analytics": { canonical: "data analytics", isBroadDiscipline: true },
  "data science": { canonical: "data science", isBroadDiscipline: true },

  // CI/CD & Version Control
  "jenkins": { canonical: "Jenkins", parentConcept: "ci/cd" },
  "github actions": { canonical: "GitHub Actions", parentConcept: "ci/cd" },
  "gitlab ci": { canonical: "GitLab CI", parentConcept: "ci/cd" },
  "circleci": { canonical: "CircleCI", parentConcept: "ci/cd" },
  "ci/cd": { canonical: "CI/CD", isBroadDiscipline: true },
  "pipeline setup": { canonical: "CI/CD", isBroadDiscipline: true },
  "git": { canonical: "Git", parentConcept: "version control" },
  "github": { canonical: "GitHub", parentConcept: "version control" },
  "gitlab": { canonical: "GitLab", parentConcept: "version control" },
  "version control": { canonical: "version control", isBroadDiscipline: true },

  // Web & APIs
  "restful api": { canonical: "REST API", parentConcept: "api design" },
  "rest api": { canonical: "REST API", parentConcept: "api design" },
  "rest": { canonical: "REST API", parentConcept: "api design" },
  "graphql": { canonical: "GraphQL", parentConcept: "api design" },
  "api design": { canonical: "API design", isBroadDiscipline: true },
  "node.js": { canonical: "Node.js", parentConcept: "backend development" },
  "nodejs": { canonical: "Node.js", parentConcept: "backend development" },
  "express.js": { canonical: "Express.js", parentConcept: "backend development" },
  "express": { canonical: "Express.js", parentConcept: "backend development" },
  "django": { canonical: "Django", parentConcept: "backend development" },
  "fastapi": { canonical: "FastAPI", parentConcept: "backend development" },
  "server-side development": { canonical: "server-side development", isBroadDiscipline: true },
  "backend development": { canonical: "backend development", isBroadDiscipline: true },

  // Engineering & Architecture
  "staad.pro": { canonical: "STAAD.Pro", parentConcept: "structural analysis" },
  "staad": { canonical: "STAAD.Pro", parentConcept: "structural analysis" },
  "structural analysis": { canonical: "structural analysis", isBroadDiscipline: true },
  "solidworks": { canonical: "SolidWorks", parentConcept: "cad" },
  "cad": { canonical: "CAD", isBroadDiscipline: true },
  "revit": { canonical: "Revit", parentConcept: "bim" },
  "bim": { canonical: "BIM", isBroadDiscipline: true },
  "power systems": { canonical: "Power Systems", isBroadDiscipline: true },
  "electrical protection": { canonical: "Electrical Protection", isBroadDiscipline: true },
  "etap": { canonical: "ETAP", parentConcept: "power systems" },

  // Business & Finance
  "financial reporting": { canonical: "Financial Reporting", isBroadDiscipline: true },
  "ifrs": { canonical: "IFRS", parentConcept: "financial reporting" },
  "audit": { canonical: "Audit", isBroadDiscipline: true },
  "internal controls": { canonical: "Internal Controls", isBroadDiscipline: true },
  "coso": { canonical: "COSO", parentConcept: "internal controls" },
  "talent acquisition": { canonical: "Talent Acquisition", isBroadDiscipline: true },
  "recruitment": { canonical: "Talent Acquisition", isBroadDiscipline: true },
  "hr": { canonical: "Human Resources", isBroadDiscipline: true },

  // Other / Digital / Humanities
  "policy analysis": { canonical: "Policy Analysis", isBroadDiscipline: true },
  "research methods": { canonical: "Research Methods", isBroadDiscipline: true },
  "content writing": { canonical: "Content Writing", isBroadDiscipline: true },
  "seo": { canonical: "SEO", parentConcept: "digital marketing" },
  "project coordination": { canonical: "Project Coordination", isBroadDiscipline: true },
  "agile": { canonical: "Agile", isBroadDiscipline: true },
};

export const GENERIC_ISOLATED_WORDS = new Set([
  "implementation",
  "setup",
  "pipeline setup",
  "using",
  "with",
  "for",
  "and",
  "or",
  "in",
  "to",
  "tools",
  "tool",
  "basics",
  "fundamentals",
  "skills",
  "development",
  "design",
  "practice",
  "methodology",
  "methodologies",
]);

export interface AtomicGapComponent {
  raw: string;
  normalized: string;
  canonical: string;
  parentConcept?: string;
  isSpecificToolOrTech: boolean;
}

export function decomposeCompoundGap(gapStr: string): AtomicGapComponent[] {
  let text = (gapStr || "").trim();
  if (!text) return [];

  // Protect acronyms with slashes
  for (const [acronym, placeholder] of Object.entries(PROTECTED_ACRONYMS)) {
    const escaped = acronym.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
    const regex = new RegExp(`(^|\\s|[.,;()])${escaped}($|\\s|[.,;()])`, "gi");
    text = text.replace(regex, `$1${placeholder}$2`);
  }

  const rawPieces: string[] = [];

  // 1. Parentheticals: (PostgreSQL/MySQL), (MongoDB)
  const parenRegex = /\(([^)]+)\)|\[([^\]]+)\]/g;
  let match;
  while ((match = parenRegex.exec(text)) !== null) {
    const inner = match[1] || match[2];
    if (inner) {
      inner.split(/[\/,;]|\s+(?:and|or)\s+/i).forEach((p) => rawPieces.push(p));
    }
  }

  // Remove parentheticals
  const outerText = text.replace(parenRegex, " ");

  // 2. Split outer clauses by conjunctions & prepositional dividers
  const clauses = outerText.split(/[,;]|\s+(?:and|or|with|using|under|including|such as|for)\s+/i);
  for (const clause of clauses) {
    const subParts = clause.split(/[\/]/);
    for (const sub of subParts) {
      rawPieces.push(sub);
    }
  }

  const components: AtomicGapComponent[] = [];
  const seenNorm = new Set<string>();

  function registerPiece(phrase: string) {
    // Restore protected acronyms
    let piece = phrase;
    for (const [acronym, placeholder] of Object.entries(PROTECTED_ACRONYMS)) {
      piece = piece.replace(new RegExp(placeholder, "g"), acronym);
    }

    let clean = piece
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D-]/g, " ")
      .replace(/^[,\s/.:\-]+|[,\s/.:\-]+$/g, "")
      .replace(/^(using|with|and|or|for|in|to|under|such as|including)\s+/i, "")
      .replace(/\s+(using|with|and|or|for|in|to|under)\s*$/i, "")
      .trim();

    if (!clean || clean.length < 2) return;
    const norm = clean.toLowerCase();

    // Ignore pure filler/isolated words
    if (GENERIC_ISOLATED_WORDS.has(norm)) return;

    // Check multi-word phrase for embedded known tools/concepts, e.g. "RESTful API design" -> "RESTful API" + "API design"
    // Only split if the phrase itself is not ALREADY an established canonical entity (e.g. "github actions", "restful api")
    if (norm.includes(" ") && !CANONICAL_TOOL_MAP[norm]) {
      const sortedKeys = Object.keys(CANONICAL_TOOL_MAP).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (norm.startsWith(key + " ") || norm.endsWith(" " + key)) {
          const rest = norm.replace(key, "").trim();
          registerPiece(key);
          if (rest && !GENERIC_ISOLATED_WORDS.has(rest)) {
            registerPiece(rest);
          }
          return;
        }
      }
    }

    if (seenNorm.has(norm)) return;
    seenNorm.add(norm);

    const info = CANONICAL_TOOL_MAP[norm];
    components.push({
      raw: clean,
      normalized: norm,
      canonical: info?.canonical || clean,
      parentConcept: info?.parentConcept,
      isSpecificToolOrTech: info ? !info.isBroadDiscipline : !norm.includes(" "),
    });
  }

  for (const p of rawPieces) {
    registerPiece(p);
  }

  return components;
}

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
  atomicComponents?: AtomicGapComponent[];
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
    atomicComponents: decomposeCompoundGap(raw),
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
  isPartialGap?: boolean;
  matchScore: number;
  matchedConcept?: string;
  matchedComponents?: string[];
  unmatchedComponents?: string[];
  coverageRatio?: number;
  groundedRationale?: string;
  evidence: MatchEvidence;
}

/**
 * Evaluates whether a candidate resource truly teaches the identified gap subject matter.
 * Prevents generic tools (e.g. Python, SQL, cloud, performance) from triggering false-positive direct gap matches.
 */
export function evaluateGapMatch(
  gap: NormalizedGap,
  resource: LearningResource,
  userPrimaryDomain: CareerDomainProfile | null,
  profile?: ResumeCredentialProfile
): GapEvaluationResult {
  const resourceSkills = (resource.skills || []).map((s) => s.toLowerCase().trim());
  const resourceSubskills = (resource.subskills || []).map((s) => s.toLowerCase().trim());
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

  // Priority 1: Atomic Compound Gap Component Evaluation
  if (gap.atomicComponents && gap.atomicComponents.length > 0) {
    const matched: string[] = [];
    const unmatched: string[] = [];

    for (const comp of gap.atomicComponents) {
      const compNorm = comp.normalized;
      const compCanonical = comp.canonical;

      let isCompMatched = false;

      // 1. Exact or canonical match on resource skills
      for (const skill of resourceSkills) {
        if (skill === compNorm || skill === compCanonical.toLowerCase()) {
          isCompMatched = true;
          break;
        }
        // Upward generalization: resource has specific tool (e.g. mysql), comp is parent (e.g. sql)
        const skillInfo = CANONICAL_TOOL_MAP[skill];
        if (skillInfo?.parentConcept && skillInfo.parentConcept === compNorm) {
          isCompMatched = true;
          break;
        }
      }

      // 2. Subskills or tags
      if (!isCompMatched) {
        if (resourceSubskills.some((s) => s === compNorm || s === compCanonical.toLowerCase())) {
          isCompMatched = true;
        } else if (resourceTags.some((t) => t === compNorm)) {
          isCompMatched = true;
        }
      }

      // 3. Negative Semantic Boundaries Enforcement:
      // Git/GitHub NEVER matches CI/CD, Jenkins, GitHub Actions, or GitLab CI
      if (
        (compNorm === "ci/cd" || compNorm === "jenkins" || compNorm === "github actions" || compNorm === "gitlab ci") &&
        !resourceSkills.some((s) => s === "ci/cd" || s === "jenkins" || s === "github actions" || s === "gitlab ci") &&
        !resourceSubskills.some((s) => s === "ci/cd" || s === "jenkins" || s === "github actions" || s === "gitlab ci")
      ) {
        isCompMatched = false;
      }

      // Docker NEVER matches Kubernetes
      if (compNorm === "kubernetes" && !resourceSkills.includes("kubernetes") && !resourceSubskills.includes("kubernetes")) {
        isCompMatched = false;
      }
      // Kubernetes NEVER matches Docker
      if (compNorm === "docker" && !resourceSkills.includes("docker") && !resourceSubskills.includes("docker")) {
        isCompMatched = false;
      }
      // MySQL NEVER matches MongoDB
      if (compNorm === "mongodb" && !resourceSkills.includes("mongodb") && !resourceSubskills.includes("mongodb")) {
        isCompMatched = false;
      }
      // REST NEVER matches GraphQL
      if (compNorm === "graphql" && !resourceSkills.includes("graphql") && !resourceSubskills.includes("graphql")) {
        isCompMatched = false;
      }

      // QA Testing (Cypress, Selenium) NEVER matches infrastructure automation or systems/network administration
      if (
        (compNorm.includes("automation") || compNorm.includes("infrastructure") || compNorm.includes("system") || compNorm.includes("network")) &&
        !compNorm.includes("test") && !compNorm.includes("qa") &&
        (resourceSkills.includes("cypress") || resourceSkills.includes("selenium") || resourceTags.includes("cypress") || resourceTags.includes("selenium")) &&
        !resourceSkills.some((s) => s.includes("ansible") || s.includes("terraform") || s.includes("powershell") || s.includes("bash") || s.includes("infrastructure"))
      ) {
        isCompMatched = false;
      }

      // Machine Learning / Data Science (Pandas, Scikit-Learn, TensorFlow, PyTorch) NEVER matches infrastructure automation or network/system administration
      if (
        (compNorm.includes("automation") || compNorm.includes("infrastructure") || compNorm.includes("system") || compNorm.includes("network") || compNorm.includes("active directory") || compNorm.includes("virtualization")) &&
        !compNorm.includes("machine learning") && !compNorm.includes("data") && !compNorm.includes("ai") &&
        (resourceSkills.includes("pandas") || resourceSkills.includes("scikit-learn") || resourceSkills.includes("tensorflow") || resourceSkills.includes("pytorch") || resourceSkills.includes("deep learning"))
      ) {
        isCompMatched = false;
      }

      // Broad concept match (e.g. "database management", "api design"):
      if (!isCompMatched) {
        if (compNorm === "database management" || compNorm === "databases") {
          if (resourceSkills.some((s) => s === "mysql" || s === "postgresql" || s === "mongodb" || s === "sql" || s === "databases")) {
            isCompMatched = true;
          }
        } else if (compNorm === "api design") {
          if (resourceSkills.some((s) => s === "rest api" || s === "graphql" || s === "restful api")) {
            isCompMatched = true;
          }
        } else if (compNorm === "structural analysis") {
          if (resourceSkills.some((s) => s === "staad" || s === "staad.pro" || s === "structural analysis")) {
            isCompMatched = true;
          }
        } else if (compNorm === "cad") {
          if (resourceSkills.some((s) => s === "solidworks" || s === "autocad" || s === "cad")) {
            isCompMatched = true;
          }
        } else if (compNorm === "financial reporting") {
          if (resourceSkills.some((s) => s === "ifrs" || s === "gaap" || s === "financial reporting")) {
            isCompMatched = true;
          }
        } else if (compNorm === "internal controls") {
          if (resourceSkills.some((s) => s === "coso" || s === "internal controls" || s === "internal audit")) {
            isCompMatched = true;
          }
        }
      }

      if (isCompMatched) {
        matched.push(compCanonical);
      } else {
        unmatched.push(compCanonical);
      }
    }

    const total = gap.atomicComponents.length;
    const coverageRatio = total > 0 ? matched.length / total : 0;
    const substantiveUnmatched = unmatched.filter((u) => !GENERIC_TECHNOLOGY_WORDS.has(u.toLowerCase()));
    const hasSubstantiveMatch = matched.some((m) => !GENERIC_TECHNOLOGY_WORDS.has(m.toLowerCase()));
    const isDirect =
      total === 1
        ? matched.length === 1 && isDomainDirectMatch
        : isDomainDirectMatch &&
          (coverageRatio >= 0.75 || (substantiveUnmatched.length === 0 && hasSubstantiveMatch));

    // A partial gap match must either have substantive component match or be domain-relevant
    // It is strictly rejected if it only matches generic technology words while having no role/domain relevance
    let isPartial = !isDirect && matched.length > 0;
    if (!hasSubstantiveMatch && !isDomainDirectMatch) {
      isPartial = false;
    }

    // Candidate-owned skill gate: If candidate already demonstrates every single matched component,
    // and the gap has remaining unmatched components, this resource offers zero new remediation for this gap.
    if (profile && profile.demonstratedSkills && profile.demonstratedSkills.size > 0 && matched.length > 0 && unmatched.length > 0) {
      const allMatchedAlreadyDemonstrated = matched.every((m) =>
        profile.demonstratedSkills.has(m.toLowerCase().trim())
      );
      if (allMatchedAlreadyDemonstrated) {
        isPartial = false;
      }
    }

    if (isDirect || isPartial) {
      let matchedStr = "";
      if (matched.length === 1) {
        matchedStr = matched[0];
      } else if (matched.length === 2) {
        matchedStr = `${matched[0]} and ${matched[1]}`;
      } else if (matched.length > 2) {
        matchedStr = `${matched.slice(0, -1).join(", ")}, and ${matched[matched.length - 1]}`;
      }

      const matchedTopics = matched
        .map((m) => {
          const info = CANONICAL_TOOL_MAP[m.toLowerCase()];
          return info?.parentConcept || (info?.isBroadDiscipline ? info.canonical.toLowerCase() : "");
        })
        .filter(Boolean);
      const uniqueTopics = Array.from(new Set(matchedTopics));
      const gapTopic = uniqueTopics.length > 0 ? uniqueTopics.join(" and ") : "relevant skill";

      let groundedRationale = "";
      if (isDirect) {
        groundedRationale = `Directly addresses your identified gap in "${gap.raw}" by developing ${matchedStr} for your target role.`;
      } else {
        groundedRationale = `Builds practical ${matchedStr} skills related to your identified ${gapTopic} gap for your target role.`;
      }

      const matchScore = isDirect
        ? (isDomainDirectMatch ? 500 : 250)
        : (isDomainDirectMatch ? Math.round(250 + 200 * coverageRatio) : Math.round(150 + 100 * coverageRatio));

      return {
        isMatch: true,
        isDirectGap: isDirect,
        isPartialGap: isPartial,
        matchScore,
        matchedConcept: matchedStr,
        matchedComponents: matched,
        unmatchedComponents: unmatched,
        coverageRatio,
        groundedRationale,
        evidence: {
          gapSubjectOverlap: true,
          competencyOverlap: true,
          roleRelevance: isDomainDirectMatch,
          genericKeywordOnly: false,
          matchedConcept: matchedStr,
        },
      };
    }

    // If compound gap had multiple components and 0 matched, return early
    if (total > 1) {
      return {
        isMatch: false,
        isDirectGap: false,
        isPartialGap: false,
        matchScore: 0,
        evidence: {
          gapSubjectOverlap: false,
          competencyOverlap: false,
          roleRelevance: isRoleRelevant,
          genericKeywordOnly: false,
        },
      };
    }
  }

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
        ((concept === "programming in python" || concept === "python programming" || concept === "python fundamentals") && (skill === "python" || skill === "python programming" || skill === "python development"));

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

  // Check if this specific skill is an isolated missing gap.
  // If the candidate already demonstrates this skill on their resume,
  // beginner tutorials in this skill are NOT suitable remediation for compound or adjacent gaps.
  const isExplicitGap = gaps.some((g) => {
    // If the gap has multiple atomic components (e.g. "Automation with Python and Ansible"),
    // candidate possessing Python does NOT make a beginner Python course an explicit gap remediation.
    if (g.atomicComponents && g.atomicComponents.length > 1) {
      return false;
    }
    const cleanRaw = g.raw.toLowerCase().trim();
    return cleanRaw === primarySkill || cleanRaw === `skills in ${primarySkill}`;
  });

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
  selfAssessmentRatings?: Record<string, string>;
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
      if (params.categoryId === "certifications") {
        if (resource.type !== "certification" && resource.category !== "certifications") {
          continue;
        }
      } else if (params.categoryId === "courses") {
        if (resource.type !== "course" && resource.category !== "courses") {
          continue;
        }
      } else if (params.categoryId === "practice") {
        const isPracticeType =
          resource.type === "practice" ||
          resource.type === "video" ||
          resource.type === "guide" ||
          resource.type === "documentation" ||
          resource.type === "article" ||
          resource.type === "seminar" ||
          resource.type === "module" ||
          resource.category === "practice";
        if (!isPracticeType) {
          continue;
        }
      } else {
        if (resource.category !== params.categoryId) {
          continue;
        }
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

    // Self-Assessment Confidence Personalization
    let selfAssessmentWeakBoost = false;
    let selfAssessmentWeakSkill = "";
    if (params.selfAssessmentRatings && Object.keys(params.selfAssessmentRatings).length > 0) {
      for (const [sKey, rating] of Object.entries(params.selfAssessmentRatings)) {
        const sLower = sKey.toLowerCase().trim();
        const matchesSkill = resourceSkills.some((rs) => rs === sLower || rs.includes(sLower) || sLower.includes(rs));
        if (matchesSkill) {
          if (rating === "WEAK") {
            score += 150;
            selfAssessmentWeakBoost = true;
            selfAssessmentWeakSkill = sKey;
          } else if (rating === "STRONG") {
            const isBeginner =
              resource.level === "beginner" ||
              /\b(for beginners|basics|fundamentals|introduction to|intro to)\b/i.test(resource.title);
            if (isBeginner) {
              score -= 50;
            } else if (resource.level === "advanced" || resource.level === "intermediate") {
              score += 30;
            }
          }
        }
      }
    }

    let reason = "";
    let itemEvidence: MatchEvidence = {
      gapSubjectOverlap: false,
      competencyOverlap: false,
      roleRelevance: false,
      genericKeywordOnly: false,
    };

    // TIER 1: DIRECT RESUME SKILL GAP MATCH (AND PARTIAL COMPOUND GAP MATCH)
    let bestGapScore = 0;
    let directGapEvaluated = false;
    let bestPartialScore = 0;
    let partialGapEvaluated = false;
    let partialGapName = "";
    let partialComp = "";
    let partialRationale = "";
    let partialEvidence: MatchEvidence = {
      gapSubjectOverlap: false,
      competencyOverlap: false,
      roleRelevance: false,
      genericKeywordOnly: false,
    };

    for (const gap of normalizedGaps) {
      const evaluation = evaluateGapMatch(gap, resource, primaryDomain, resumeProfile);
      if (evaluation.isDirectGap && evaluation.matchScore > bestGapScore) {
        bestGapScore = evaluation.matchScore;
        matchedGapName = gap.raw;
        matchedComp = evaluation.matchedConcept || gap.raw;
        itemEvidence = evaluation.evidence;
        directGapEvaluated = true;
      } else if (evaluation.isPartialGap && evaluation.matchScore > bestPartialScore) {
        bestPartialScore = evaluation.matchScore;
        partialGapName = gap.raw;
        partialComp = evaluation.matchedConcept || gap.raw;
        partialRationale = evaluation.groundedRationale
          ? evaluation.groundedRationale.replace(/for your target role\.$/, `for ${params.targetPosition || "your target role"}.`)
          : `Builds practical ${partialComp} skills related to your identified gap for ${params.targetPosition || "your target role"}.`;
        partialEvidence = evaluation.evidence;
        partialGapEvaluated = true;
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
    } else if (partialGapEvaluated && bestPartialScore > 0) {
      if (partialEvidence.roleRelevance) {
        tier = "TIER_2_ROLE_COMPETENCY";
        score += 250 + bestPartialScore;
        matchedGapName = partialGapName;
        matchedComp = partialComp;
        itemEvidence = partialEvidence;
        reason = partialRationale;
      } else {
        // Enforce role relevance gate: a resource lacking role relevance must NOT be Tier 2
        tier = "TIER_4_GENERIC";
        score = 50;
        itemEvidence = partialEvidence;
      }
    } else {
      const targetTokens = getCareerTitleTokens(targetPos);

      const isDirectCareerPathMatch = targetPos && resourceCareerPaths.some(
        (cp) => {
          const cpLower = cp.toLowerCase().trim();
          const targetLower = targetPos.toLowerCase().trim();
          if (cpLower === targetLower) return true;

          // Cross-domain safety: Partial/compound career path matches require domain compatibility
          const isDomainCompatible =
            !primaryDomainId ||
            resourceDomainIds.length === 0 ||
            resourceDomainIds.includes(primaryDomainId) ||
            (academicDomain && resourceDomainIds.includes(academicDomain.id));

          if (!isDomainCompatible) {
            return false;
          }

          // Whole-token non-generic alignment
          const cpTokens = getCareerTitleTokens(cpLower);
          if (targetTokens.length > 0 && cpTokens.length > 0) {
            const allTargetInCp = targetTokens.every((t) => cpTokens.includes(t));
            const allCpInTarget = cpTokens.every((t) => targetTokens.includes(t));
            if (allTargetInCp || allCpInTarget) {
              return true;
            }
          }

          return false;
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
        // Generic domain and competency compatibility: requires domain adjacency and substantive competency overlap
        primaryDomainId &&
        resourceDomainIds.some((id) => supportingDomainIds.includes(id)) &&
        ((primaryDomain && resourceSkills.some((s) => primaryDomain.coreCompetencies.includes(s))) ||
          (academicDomain && resourceSkills.some((s) => academicDomain.coreCompetencies.includes(s))) ||
          (resource.type !== "certification" &&
            (resource.level === "beginner" || (resource.tags || []).some((t) => t.includes("fundamental") || t.includes("foundation")))))
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

    if (selfAssessmentWeakBoost && tier !== "TIER_1_DIRECT_GAP") {
      tier = "TIER_2_ROLE_COMPETENCY";
      if (!reason) {
        reason = `Targeted remediation: Strengthens ${selfAssessmentWeakSkill} based on your self-assessment confidence rating.`;
      }
      itemEvidence = {
        gapSubjectOverlap: false,
        competencyOverlap: true,
        roleRelevance: true,
        genericKeywordOnly: false,
        matchedConcept: selfAssessmentWeakSkill,
      };
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
    const tier2Items = scoredItems.filter((i) => i.relevanceTier === "TIER_2_ROLE_COMPETENCY");
    const otherItems = scoredItems.filter((i) => i.relevanceTier !== "TIER_1_DIRECT_GAP" && i.relevanceTier !== "TIER_2_ROLE_COMPETENCY");

    const balanceItemsByGap = (items: MatchedResourceItem[], maxPerGap: number): MatchedResourceItem[] => {
      if (items.length === 0) return [];
      const gapBuckets = new Map<string, MatchedResourceItem[]>();
      for (const item of items) {
        const gapKey = (item.matchedSkillGap || item.matchedCompetency || "DEFAULT").toLowerCase().trim();
        if (!gapBuckets.has(gapKey)) {
          gapBuckets.set(gapKey, []);
        }
        gapBuckets.get(gapKey)!.push(item);
      }

      const balanced: MatchedResourceItem[] = [];
      let addedInRound = true;
      let roundCount = 0;
      while (addedInRound && roundCount < maxPerGap) {
        addedInRound = false;
        roundCount++;
        for (const [_, bucketItems] of gapBuckets) {
          if (bucketItems.length >= roundCount) {
            balanced.push(bucketItems[roundCount - 1]);
            addedInRound = true;
          }
        }
      }

      const balancedIds = new Set(balanced.map((i) => i.id));
      const remaining = items.filter((i) => !balancedIds.has(i.id));
      return [...balanced, ...remaining];
    };

    const balancedTier1 = balanceItemsByGap(tier1Items, 2);
    const balancedTier2 = balanceItemsByGap(tier2Items, 2);

    return [...balancedTier1, ...balancedTier2, ...otherItems];
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
 * Dynamically curates up to 3 Certifications, 3 Courses, and 3 Practical Resources
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

  const maxCerts = 3;
  const maxCourses = 3;
  const maxPractice = 3;

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



