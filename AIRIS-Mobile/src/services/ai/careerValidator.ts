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
  isUnrelatedWarning?: boolean;
  reason?: string;
}

export const validateCareerRole = async (
  role: string,
  degreeProgram: string
): Promise<ValidationResult> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

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
      reason: `"${role}" seems too generic. Try adding a modifier (e.g. "${role} Specialist" or "${role} Engineer").`
    };
  }

  if (!degreeProgram) {
    return { isValid: true };
  }

  // Generalized Dynamic Domain Compatibility Matching using canonical catalog
  const { tipManilaPrograms } = await import("../../data/tipManilaPrograms");

  let targetCollege = tipManilaPrograms.find((c) =>
    c.programs.some((p) => p.name.toLowerCase() === degreeProgram.toLowerCase())
  );

  if (!targetCollege) {
    // Fuzzy search degree program match
    targetCollege = tipManilaPrograms.find((c) =>
      c.programs.some((p) => p.name.toLowerCase().includes(degreeProgram.toLowerCase()) || degreeProgram.toLowerCase().includes(p.name.toLowerCase()))
    );
  }

  if (targetCollege) {
    const suggestedInCollege = targetCollege.programs.flatMap((p) => p.suggestedPositions.map((sp) => sp.toLowerCase()));

    const isDirectMatch = suggestedInCollege.some((sp) =>
      sp.includes(cleanRole) || cleanRole.includes(sp) || words.some((w) => sp.includes(w))
    );

    if (!isDirectMatch) {
      // Check if role belongs to another distinct college's suggested positions
      const otherColleges = tipManilaPrograms.filter((c) => c.name !== targetCollege?.name);
      const isOtherDomainMatch = otherColleges.some((c) =>
        c.programs.some((p) =>
          p.suggestedPositions.some((sp) => sp.toLowerCase().includes(cleanRole) || cleanRole.includes(sp.toLowerCase()))
        )
      );

      if (isOtherDomainMatch) {
        return {
          isValid: true,
          isUnrelatedWarning: true,
          reason: `"${role}" differs significantly from your academic background (${degreeProgram}). Your resume score and recommendations may be less aligned. Do you want to continue?`
        };
      }
    }
  }

  return { isValid: true };
};
