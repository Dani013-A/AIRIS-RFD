// Helper Service: Validates user-entered custom job paths
const COMMON_PROFESSIONAL_SUFFIXES = [
  "developer", "engineer", "designer", "programmer", "analyst",
  "consultant", "architect", "manager", "specialist", "officer",
  "coordinator", "representative", "accountant", "auditor", "writer",
  "counselor", "assistant", "therapist", "pharmacist", "nurse",
  "technician", "administrator", "scientist", "lead", "leads",
  "intern", "apprentice", "staff", "planner", "estimator", "agent",
  "executive", "animator", "artist", "editor", "educator", "instructor",
  "teacher", "strategist", "expert", "pro", "professional", "operator",
  "supervisor", "director"
];

const STOP_WORDS = [
  "none", "nothing", "student", "unemployed", "job", "career",
  "work", "something", "anything", "any", "ceo", "boss",
  "founder", "owner", "president", "king", "queen", "god",
  "gamer", "streamer", "influencer", "hacker", "asd", "qwe", "zxc"
];

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export const validateCareerRole = async (
  role: string,
  degreeProgram: string
): Promise<ValidationResult> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const cleanRole = role.trim().toLowerCase();
  if (cleanRole.length < 3) {
    return {
      isValid: false,
      reason: "The target job title is too short to represent a standard career path."
    };
  }

  if (STOP_WORDS.some(word => cleanRole === word || cleanRole.split(/[\s-]+/).includes(word))) {
    return {
      isValid: false,
      reason: "This does not match a standard professional job title. Please specify a real role."
    };
  }

  const words = cleanRole.split(/[\s-]+/);
  const hasSuffix = words.some(word => COMMON_PROFESSIONAL_SUFFIXES.includes(word));
  
  if (!hasSuffix && words.length < 2) {
    return {
      isValid: false,
      reason: `"${role}" seems too generic. Try adding a modifier (e.g. "${role} Developer" or "${role} Specialist").`
    };
  }

  const lowerProg = degreeProgram.toLowerCase();

  // Validate computing tracks
  if (lowerProg.includes("computer") || lowerProg.includes("information technology") || lowerProg.includes("data science") || lowerProg.includes("multimedia")) {
    const techKeywords = [
      "software", "web", "app", "mobile", "frontend", "backend", "fullstack", "full-stack", "qa",
      "quality", "test", "cloud", "devops", "network", "system", "cyber", "security", "data",
      "analytics", "ml", "ai", "machine", "game", "animator", "3d", "multimedia", "design", "it",
      "programmer", "developer", "administrator", "scrum", "agile", "product", "technology", "tech"
    ];
    if (!techKeywords.some(kw => cleanRole.includes(kw)) && !words.some(w => ["developer", "programmer", "engineer"].includes(w))) {
      return {
        isValid: false,
        reason: `This position is unrelated to your computing field (${degreeProgram}).`
      };
    }
  } 
  // Validate engineering tracks
  else if (lowerProg.includes("civil") || lowerProg.includes("mechanical") || lowerProg.includes("electrical") || lowerProg.includes("electronics") || lowerProg.includes("chemical") || lowerProg.includes("industrial") || lowerProg.includes("architecture")) {
    const engKeywords = [
      "structural", "civil", "hvac", "mechanical", "electrical", "electronics", "power", "chemical",
      "industrial", "process", "plant", "manufacturing", "draftsman", "architect", "cad", "bim",
      "site", "project", "construction", "maintenance", "geotechnical", "estimation", "estimator",
      "safety", "quality", "automotive", "operations"
    ];
    if (!engKeywords.some(kw => cleanRole.includes(kw)) && !cleanRole.includes("engineer") && !cleanRole.includes("architect")) {
      return {
        isValid: false,
        reason: `This role does not align with your engineering/architecture field (${degreeProgram}).`
      };
    }
  } 
  // Validate business tracks
  else if (lowerProg.includes("accountancy") || lowerProg.includes("accounting") || lowerProg.includes("business") || lowerProg.includes("marketing") || lowerProg.includes("human resource") || lowerProg.includes("logistics") || lowerProg.includes("finance")) {
    const bizKeywords = [
      "accounting", "accountant", "auditor", "bookkeeper", "tax", "audit", "financial", "finance",
      "analyst", "investment", "credit", "treasury", "hr", "human", "recruitment", "logistics",
      "supply", "procurement", "warehouse", "inventory", "marketing", "brand", "sales", "business"
    ];
    if (!bizKeywords.some(kw => cleanRole.includes(kw)) && !words.some(w => ["manager", "analyst", "specialist", "officer"].includes(w))) {
      return {
        isValid: false,
        reason: `This role is outside the scope of your business/accounting program (${degreeProgram}).`
      };
    }
  }

  return { isValid: true };
};
