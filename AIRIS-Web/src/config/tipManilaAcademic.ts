/**
 * Single Source of Truth for T.I.P. Manila Academic & Coordinator Structure.
 * Covers all 4 Undergraduate Colleges and 20 Degree Programs.
 * (Senior High School / SHS removed per administrative scope requirement).
 */

export interface DegreeProgramConfig {
  name: string;
  shortCode?: string;
  level: "undergraduate";
}

export interface CollegeConfig {
  id: string;
  name: string;
  shortName: string;
  programs: DegreeProgramConfig[];
}

export interface CoordinatorConfig {
  id: string;
  name: string;
  shortName: string;
  collegeId: string;
  collegeName: string;
}

export const TIP_MANILA_COLLEGES: CollegeConfig[] = [
  {
    id: "ccs",
    name: "College of Computer Studies",
    shortName: "CCS",
    programs: [
      { name: "BS Information Technology", shortCode: "BSIT", level: "undergraduate" },
      { name: "BS Computer Science", shortCode: "BSCS", level: "undergraduate" },
      { name: "BS Data Science and Analytics", shortCode: "BSDSA", level: "undergraduate" },
      { name: "BS Entertainment and Multimedia Computing", shortCode: "BSEMC", level: "undergraduate" },
    ],
  },
  {
    id: "cea",
    name: "College of Engineering and Architecture",
    shortName: "CEA",
    programs: [
      { name: "BS Architecture", shortCode: "BSArch", level: "undergraduate" },
      { name: "BS Chemical Engineering", shortCode: "BSChE", level: "undergraduate" },
      { name: "BS Civil Engineering", shortCode: "BSCE", level: "undergraduate" },
      { name: "BS Computer Engineering", shortCode: "BSCPE", level: "undergraduate" },
      { name: "BS Electrical Engineering", shortCode: "BSEE", level: "undergraduate" },
      { name: "BS Electronics Engineering", shortCode: "BSECE", level: "undergraduate" },
      { name: "BS Industrial Engineering", shortCode: "BSIE", level: "undergraduate" },
      { name: "BS Mechanical Engineering", shortCode: "BSME", level: "undergraduate" },
    ],
  },
  {
    id: "cbe",
    name: "College of Business Education",
    shortName: "CBE",
    programs: [
      { name: "BS Accountancy", shortCode: "BSA", level: "undergraduate" },
      { name: "BS Accounting Information System", shortCode: "BSAIS", level: "undergraduate" },
      { name: "BS Business Administration", shortCode: "BSBA", level: "undergraduate" },
      { name: "BS Business Administration major in Financial Management", shortCode: "BSBA-FM", level: "undergraduate" },
      { name: "BS Business Administration major in Human Resource Management", shortCode: "BSBA-HRM", level: "undergraduate" },
      { name: "BS Business Administration major in Logistics and Supply Chain Management", shortCode: "BSBA-LSCM", level: "undergraduate" },
      { name: "BS Business Administration major in Marketing Management", shortCode: "BSBA-MM", level: "undergraduate" },
    ],
  },
  {
    id: "ca",
    name: "College of Arts",
    shortName: "CA",
    programs: [
      { name: "Bachelor of Arts in Psychology", shortCode: "ABPsych", level: "undergraduate" },
    ],
  },
];

/**
 * Authoritative Coordinator assignments per Department/College.
 */
export const TIP_MANILA_COORDINATORS: CoordinatorConfig[] = [
  {
    id: "ccs",
    name: "CCS Coordinator (College of Computer Studies)",
    shortName: "CCS Coordinator",
    collegeId: "ccs",
    collegeName: "College of Computer Studies",
  },
  {
    id: "cea",
    name: "CEA Coordinator (College of Engineering and Architecture)",
    shortName: "CEA Coordinator",
    collegeId: "cea",
    collegeName: "College of Engineering and Architecture",
  },
  {
    id: "cbe",
    name: "CBE Coordinator (College of Business Education)",
    shortName: "CBE Coordinator",
    collegeId: "cbe",
    collegeName: "College of Business Education",
  },
  {
    id: "ca",
    name: "CA Coordinator (College of Arts)",
    shortName: "CA Coordinator",
    collegeId: "ca",
    collegeName: "College of Arts",
  },
];

/**
 * Returns all 4 Undergraduate Colleges in T.I.P. Manila.
 */
export function getTipColleges(): CollegeConfig[] {
  return TIP_MANILA_COLLEGES;
}

/**
 * Returns all OJT Coordinators assigned to departments/colleges.
 */
export function getTipCoordinators(): CoordinatorConfig[] {
  return TIP_MANILA_COORDINATORS;
}

/**
 * Finds coordinator configuration by department/college ID.
 */
export function getCoordinatorById(coordinatorId: string): CoordinatorConfig | undefined {
  if (!coordinatorId || coordinatorId === "all") return undefined;
  const normalized = coordinatorId.trim().toLowerCase();
  return TIP_MANILA_COORDINATORS.find((c) => c.id === normalized || c.shortName.toLowerCase() === normalized);
}

/**
 * Returns all 20 official undergraduate programs.
 */
export function getAllTipPrograms(): DegreeProgramConfig[] {
  return TIP_MANILA_COLLEGES.flatMap((c) => c.programs);
}

/**
 * Finds the parent college for any given degree program name.
 */
export function findCollegeByProgramName(programName: string): CollegeConfig | undefined {
  if (!programName) return undefined;
  const normalized = programName.trim().toLowerCase();
  return TIP_MANILA_COLLEGES.find((c) =>
    c.programs.some(
      (p) =>
        p.name.toLowerCase() === normalized ||
        (p.shortCode && p.shortCode.toLowerCase() === normalized) ||
        normalized.includes(p.name.toLowerCase())
    )
  );
}
