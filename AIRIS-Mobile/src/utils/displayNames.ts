/**
 * Presentation-layer display normalization for short labels only
 * (skill chips, section pills, competency names, gap/strength tags).
 *
 * Fixes inconsistent backend/AI capitalization such as "CSs" -> "CSS"
 * and concatenated headings such as "Workexperience" -> "Work Experience".
 *
 * Rules:
 * - Known technical terms/acronyms are restored to canonical casing.
 * - Everything else is left untouched (no blind title-casing), so resume
 *   content, sentences, identifiers, and AI conclusions are never corrupted.
 * - Never applied to scores, evidence quotes, or recommendation paragraphs.
 */

const TECHNICAL_TERMS: Record<string, string> = {
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  typescript: "TypeScript",
  "react native": "React Native",
  react: "React",
  "node.js": "Node.js",
  nodejs: "Node.js",
  node: "Node.js",
  "express.js": "Express.js",
  express: "Express",
  fastapi: "FastAPI",
  git: "Git",
  github: "GitHub",
  python: "Python",
  java: "Java",
  "c++": "C++",
  "c#": "C#",
  sql: "SQL",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  mongodb: "MongoDB",
  firebase: "Firebase",
  docker: "Docker",
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  api: "API",
  apis: "APIs",
  rest: "REST",
  sdk: "SDK",
  cli: "CLI",
  ocr: "OCR",
  iot: "IoT",
  seo: "SEO",
  cad: "CAD",
  bim: "BIM",
  erp: "ERP",
  sap: "SAP",
  spss: "SPSS",
  hvac: "HVAC",
  etl: "ETL",
  nosql: "NoSQL",
  powerbi: "Power BI",
  powerpoint: "PowerPoint",
  excel: "Excel",
};

const SECTION_NAMES: Record<string, string> = {
  contactinformation: "Contact Information",
  professionalsummary: "Professional Summary",
  summary: "Summary",
  objective: "Objective",
  education: "Education",
  skills: "Skills",
  technicalskills: "Technical Skills",
  workexperience: "Work Experience",
  experience: "Experience",
  projects: "Projects",
  internships: "Internships",
  relevantcoursework: "Relevant Coursework",
  coursework: "Coursework",
  certifications: "Certifications",
  organizationsleadership: "Organizations & Leadership",
  organizations: "Organizations",
  leadership: "Leadership",
  achievements: "Achievements",
  awards: "Awards",
  languages: "Languages",
  trainings: "Trainings",
  seminars: "Seminars",
  references: "References",
  content: "Content",
};

/** Normalize one skill/competency label without touching unknown text. */
export function formatSkillDisplayName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (TECHNICAL_TERMS[lower]) return TECHNICAL_TERMS[lower];
  // Multi-word labels: restore each known term, leave other words as-is.
  if (trimmed.includes(" ")) {
    let changed = false;
    const words = trimmed.split(" ").map((word) => {
      const canonical = TECHNICAL_TERMS[word.toLowerCase()];
      if (canonical) {
        changed = true;
        return canonical;
      }
      return word;
    });
    if (changed) return words.join(" ");
  }
  return trimmed;
}

/** Normalize one resume-section label ("Workexperience" -> "Work Experience"). */
export function formatSectionDisplayName(raw: unknown): string {  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!trimmed) return "";
  const flat = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (SECTION_NAMES[flat]) return SECTION_NAMES[flat];
  // Split camelCase/PascalCase humps: "ContactInformation" -> "Contact Information".
  const spaced = trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (spaced !== trimmed) {
    const flatSpaced = spaced.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (SECTION_NAMES[flatSpaced]) return SECTION_NAMES[flatSpaced];
    // Title-case ordinary words; restore known technical terms after.
    const titled = spaced
      .split(" ")
      .map((word) => {
        if (!word) return word;
        const canonical = TECHNICAL_TERMS[word.toLowerCase()];
        if (canonical) return canonical;
        if (word === word.toUpperCase() || word === word.toLowerCase()) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word;
      })
      .join(" ");
    return titled;
  }
  return formatSkillDisplayName(trimmed);
}

/**
 * Replace whole-word concatenated section keys inside longer dynamic text
 * ("Add Standard Contactinformation Heading" ->
 *  "Add Standard Contact Information Heading").
 * Only known section names are replaced; all other text is untouched.
 */
export function fixConcatenatedSectionNames(text: unknown): string {
  if (typeof text !== "string" || !text) return typeof text === "string" ? text : "";
  let out = text;
  const keys = Object.keys(SECTION_NAMES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const canonical = SECTION_NAMES[key];
    const pattern = new RegExp(`\\b${key}\\b`, "gi");
    out = out.replace(pattern, (match) => {
      // Preserve all-caps styling if the source word was all caps.
      if (match === match.toUpperCase() && /[A-Z]/.test(match)) return canonical.toUpperCase();
      return canonical;
    });
  }
  return out;
}
