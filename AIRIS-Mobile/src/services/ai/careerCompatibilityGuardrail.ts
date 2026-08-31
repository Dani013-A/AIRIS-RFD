/**
 * Career Target Compatibility Guardrail Service for AIRIS.
 * Provides metadata and evidence-driven evaluation of target career alignment against academic background and resume evidence.
 *
 * Enforces ALIGNED, PIVOT, and DISTANT classifications dynamically without hardcoded program-specific conditionals.
 */

export interface CareerCompatibilityResult {
  classification: "ALIGNED" | "PIVOT" | "DISTANT";
  score: number; // 0 to 100
  academicProgram: string;
  targetCareer: string;
  targetDomainName: string;
  reason: string;
  relevantCompetencies: string[];
  missingPrerequisites: string[];
  transferableSkills: string[];
  requiresExplicitConfirmation: boolean;
}

export interface DomainProfile {
  id: string;
  name: string;
  roleKeywords: string[];
  coreCompetencies: string[];
  prerequisiteKnowledge: string[];
  adjacentDomains: string[];
}

export const DOMAIN_PROFILES: DomainProfile[] = [
  {
    id: "software_engineering",
    name: "Software Engineering & Web Development",
    roleKeywords: [
      "software engineer", "software developer", "full stack", "backend developer",
      "frontend developer", "web developer", "programmer", "coder", "software",
      "application developer"
    ],
    coreCompetencies: ["programming", "data structures", "algorithms", "git", "rest apis", "databases"],
    prerequisiteKnowledge: ["Object-Oriented Programming", "Software Architecture", "Version Control Systems"],
    adjacentDomains: ["data_analytics", "cybersecurity", "cloud_devops", "ui_ux", "mobile_development", "qa_testing"]
  },
  {
    id: "data_analytics",
    name: "Data Analytics & Business Intelligence",
    roleKeywords: [
      "data analyst", "data analytics", "business intelligence", "bi analyst",
      "bi developer", "data scientist", "data engineer", "reporting analyst"
    ],
    coreCompetencies: ["sql", "power bi", "tableau", "excel", "pandas", "python", "statistics"],
    prerequisiteKnowledge: ["Relational Algebra", "Statistical Analysis", "Data Visualization Standards"],
    adjacentDomains: ["software_engineering", "accountancy", "database_administration"]
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity & Information Security",
    roleKeywords: [
      "cybersecurity", "security analyst", "soc analyst", "information security",
      "penetration tester", "security engineer", "network security"
    ],
    coreCompetencies: ["network security", "cryptography", "threat analysis", "siem", "incident response"],
    prerequisiteKnowledge: ["Computer Networks", "Operating System Security", "Vulnerability Assessment"],
    adjacentDomains: ["software_engineering", "cloud_devops"]
  },
  {
    id: "ui_ux",
    name: "UI/UX & Product Design",
    roleKeywords: [
      "ui/ux", "ux designer", "ui designer", "product designer", "interaction designer",
      "visual designer", "ux researcher"
    ],
    coreCompetencies: ["figma", "ux design", "ui design", "user research", "wireframing", "prototyping"],
    prerequisiteKnowledge: ["Human-Computer Interaction", "User Research Methods", "Information Architecture"],
    adjacentDomains: ["software_engineering", "architecture", "marketing"]
  },
  {
    id: "accountancy",
    name: "Accountancy, Audit & Finance",
    roleKeywords: [
      "accountant", "auditor", "certified public accountant", "cpa", "financial accountant",
      "bookkeeper", "accounting assistant", "tax consultant"
    ],
    coreCompetencies: ["bookkeeping", "internal controls", "financial accounting", "internal audit", "ifrs", "gaap", "advanced excel"],
    prerequisiteKnowledge: ["Financial Reporting Standards (IFRS/GAAP)", "Taxation Law & Auditing Principles", "Cost Accounting"],
    adjacentDomains: ["data_analytics", "marketing"]
  },
  {
    id: "civil_engineering",
    name: "Civil & Structural Engineering",
    roleKeywords: [
      "civil engineer", "structural engineer", "site engineer", "construction engineer",
      "environmental engineer", "sanitary engineer", "civil engineering", "quantity surveyor"
    ],
    coreCompetencies: ["staad.pro", "structural analysis", "autocad", "concrete structure design", "bim", "building information modeling"],
    prerequisiteKnowledge: ["Engineering Mechanics & Statics", "Structural Mechanics & Analysis", "Concrete & Steel Code Standards"],
    adjacentDomains: ["architecture"]
  },
  {
    id: "architecture",
    name: "Architecture & Environmental Design",
    roleKeywords: [
      "architect", "architectural designer", "bim specialist", "draftsman", "architecture"
    ],
    coreCompetencies: ["revit", "autodesk revit", "architectural drafting", "cad", "bim", "spatial planning"],
    prerequisiteKnowledge: ["Architectural Design History & Theory", "Building Code & Safety Standards", "3D Spatial Modeling"],
    adjacentDomains: ["civil_engineering", "ui_ux"]
  },
  {
    id: "education_instructional_design",
    name: "Education, Pedagogy & Instructional Design",
    roleKeywords: [
      "instructional designer", "educator", "teacher", "e-learning specialist",
      "curriculum developer", "learning designer"
    ],
    coreCompetencies: ["e-learning authoring tools", "articulate storyline", "addie", "instructional design", "curriculum design", "accessibility standards", "udl"],
    prerequisiteKnowledge: ["Educational Psychology & Learning Theories", "Instructional Design Models (ADDIE/SAM)", "Curriculum Evaluation"],
    adjacentDomains: ["ui_ux", "psychology"]
  },
  {
    id: "psychology",
    name: "Psychology & Behavioral Sciences",
    roleKeywords: [
      "psychologist", "psychometrician", "human behavior specialist", "counselor", "psychology"
    ],
    coreCompetencies: ["psychometrics", "psychological assessment", "research methods", "statistical analysis", "cognitive psychology"],
    prerequisiteKnowledge: ["Psychological Assessment & Testing", "Developmental Psychology", "Abnormal Psychology & Ethics"],
    adjacentDomains: ["education_instructional_design", "data_analytics"]
  },
  {
    id: "natural_sciences",
    name: "Natural Sciences, Chemistry & Laboratory Science",
    roleKeywords: [
      "chemist", "biologist", "physicist", "lab technician", "chemical analyst",
      "laboratory scientist", "research scientist"
    ],
    coreCompetencies: ["organic chemistry", "laboratory safety", "chemical kinetics", "quantitative analysis", "spectroscopy"],
    prerequisiteKnowledge: ["Organic & Inorganic Chemistry", "Laboratory Safety & Instrumentation", "Quantitative Chemical Analysis"],
    adjacentDomains: []
  }
];

export const PROGRAM_DOMAIN_MAPPINGS: Array<{ programKeywords: string[]; primaryDomains: string[]; adjacentDomains: string[] }> = [
  {
    programKeywords: ["information technology", "computer science", "information systems", "software engineering", "computer engineering", "it", "cs"],
    primaryDomains: ["software_engineering", "data_analytics", "cybersecurity"],
    adjacentDomains: ["ui_ux", "education_instructional_design"]
  },
  {
    programKeywords: ["accountancy", "accounting", "finance", "business administration", "management accounting"],
    primaryDomains: ["accountancy", "data_analytics"],
    adjacentDomains: ["marketing"]
  },
  {
    programKeywords: ["civil engineering", "civil"],
    primaryDomains: ["civil_engineering"],
    adjacentDomains: ["architecture"]
  },
  {
    programKeywords: ["architecture", "building design"],
    primaryDomains: ["architecture"],
    adjacentDomains: ["civil_engineering", "ui_ux"]
  },
  {
    programKeywords: ["secondary education", "elementary education", "education", "teacher education"],
    primaryDomains: ["education_instructional_design"],
    adjacentDomains: ["psychology"]
  },
  {
    programKeywords: ["psychology", "behavioral science"],
    primaryDomains: ["psychology"],
    adjacentDomains: ["education_instructional_design"]
  },
  {
    programKeywords: ["chemistry", "biology", "applied physics", "biochemistry"],
    primaryDomains: ["natural_sciences"],
    adjacentDomains: []
  }
];

function resolveTargetDomain(targetCareer: string): DomainProfile | null {
  const targetLower = targetCareer.toLowerCase().trim();
  for (const domain of DOMAIN_PROFILES) {
    if (domain.roleKeywords.some((kw) => targetLower === kw || targetLower.includes(kw) || kw.includes(targetLower))) {
      return domain;
    }
  }
  return null;
}

function resolveProgramDomains(academicProgram: string): { primary: string[]; adjacent: string[] } {
  const progLower = academicProgram.toLowerCase().trim();
  const matchedPrimary: string[] = [];
  const matchedAdjacent: string[] = [];

  for (const mapping of PROGRAM_DOMAIN_MAPPINGS) {
    if (mapping.programKeywords.some((kw) => progLower.includes(kw) || kw.includes(progLower))) {
      matchedPrimary.push(...mapping.primaryDomains);
      matchedAdjacent.push(...mapping.adjacentDomains);
    }
  }

  return {
    primary: Array.from(new Set(matchedPrimary)),
    adjacent: Array.from(new Set(matchedAdjacent))
  };
}

/**
 * Evaluates the academic and background compatibility of a proposed target career.
 * Enforces ALIGNED, PIVOT, and DISTANT classifications dynamically.
 */
export function evaluateCareerTargetCompatibility(
  academicProgram: string = "",
  targetCareer: string = "",
  detectedSkills: string[] = [],
  rawResumeText: string = ""
): CareerCompatibilityResult {
  const cleanProgram = academicProgram.trim();
  const cleanCareer = targetCareer.trim();

  if (!cleanCareer) {
    return {
      classification: "ALIGNED",
      score: 100,
      academicProgram: cleanProgram,
      targetCareer: cleanCareer,
      targetDomainName: "General Career Track",
      reason: "No target career specified.",
      relevantCompetencies: [],
      missingPrerequisites: [],
      transferableSkills: [],
      requiresExplicitConfirmation: false
    };
  }

  const targetDomain = resolveTargetDomain(cleanCareer);
  const targetDomainId = targetDomain ? targetDomain.id : "general_domain";
  const targetDomainName = targetDomain ? targetDomain.name : cleanCareer;

  const progDomains = resolveProgramDomains(cleanProgram);
  const resumeSkillsLower = (detectedSkills || []).map((s) => s.toLowerCase().trim());
  const rawTextLower = (rawResumeText || "").toLowerCase();

  // Check if target domain skills are present in resume evidence
  const demonstratedTargetSkills: string[] = [];
  if (targetDomain) {
    for (const comp of targetDomain.coreCompetencies) {
      if (resumeSkillsLower.includes(comp) || rawTextLower.includes(comp)) {
        demonstratedTargetSkills.push(comp);
      }
    }
  }

  const isDirectPrimaryMatch = progDomains.primary.includes(targetDomainId);
  const isAdjacentMatch = progDomains.adjacent.includes(targetDomainId) ||
                         (targetDomain && targetDomain.adjacentDomains.some((d) => progDomains.primary.includes(d)));

  let classification: "ALIGNED" | "PIVOT" | "DISTANT" = "DISTANT";
  let score = 30;
  let reason = "";
  let missingPrerequisites: string[] = targetDomain ? [...targetDomain.prerequisiteKnowledge] : [];
  let transferableSkills: string[] = [];

  if (isDirectPrimaryMatch) {
    classification = "ALIGNED";
    score = 95;
    reason = `Strong academic background alignment between ${cleanProgram} and ${cleanCareer}.`;
    missingPrerequisites = [];
    transferableSkills = targetDomain ? targetDomain.coreCompetencies.slice(0, 3) : [];
  } else if (isAdjacentMatch) {
    classification = "PIVOT";
    score = 70;
    reason = `${cleanCareer} is a related career pivot from your ${cleanProgram} academic background. Additional specialized skills may be required.`;
    missingPrerequisites = targetDomain ? targetDomain.prerequisiteKnowledge.slice(0, 2) : [];
    transferableSkills = ["Core Problem Solving", "Analytical Thinking", "Technical Literacy"];
  } else {
    // Check if resume evidence elevates a disjoint academic background
    if (demonstratedTargetSkills.length >= 2) {
      classification = "PIVOT";
      score = 65;
      reason = `${cleanCareer} differs from your ${cleanProgram} degree, but your resume demonstrates relevant experience in ${demonstratedTargetSkills.join(", ")}.`;
      missingPrerequisites = targetDomain ? targetDomain.prerequisiteKnowledge.slice(0, 2) : [];
      transferableSkills = demonstratedTargetSkills;
    } else {
      classification = "DISTANT";
      score = 25;
      reason = `${cleanCareer} has low direct academic alignment with ${cleanProgram} and requires substantial domain-specific education and prerequisite training.`;
      missingPrerequisites = targetDomain ? targetDomain.prerequisiteKnowledge : ["Domain-Specific Core Competencies", "Specialized Professional Training"];
      transferableSkills = ["Transferable Analytical Skills", "General Problem Solving"];
    }
  }

  return {
    classification,
    score,
    academicProgram: cleanProgram,
    targetCareer: cleanCareer,
    targetDomainName,
    reason,
    relevantCompetencies: demonstratedTargetSkills.length > 0 ? demonstratedTargetSkills : (targetDomain ? targetDomain.coreCompetencies.slice(0, 3) : []),
    missingPrerequisites,
    transferableSkills,
    requiresExplicitConfirmation: classification === "DISTANT"
  };
}

/**
 * Sanitizes and formats compatibility guidance for user presentation.
 * Enforces constructive, non-legal terminology boundaries.
 */
export function formatCompatibilityNotice(result: CareerCompatibilityResult): {
  title: string;
  body: string;
  badgeColor: string;
} {
  if (result.classification === "ALIGNED") {
    return {
      title: "Strong Academic Alignment",
      body: `Your target career "${result.targetCareer}" aligns cleanly with your degree program in ${result.academicProgram}.`,
      badgeColor: "#10B981"
    };
  }

  if (result.classification === "PIVOT") {
    return {
      title: "Career Transition Focus",
      body: `"${result.targetCareer}" is a related specialization. Additional background competencies (${result.missingPrerequisites.join(", ") || "domain skills"}) will strengthen your alignment.`,
      badgeColor: "#F59E0B"
    };
  }

  return {
    title: "Low Academic Alignment Notice",
    body: `"${result.targetCareer}" differs substantially from your ${result.academicProgram} background. Substantial additional domain preparation (${result.missingPrerequisites.join(", ")}) is recommended before activating this career target.`,
    badgeColor: "#EF4444"
  };
}
