import catalog from "./tipManilaPrograms.json";

export interface DegreeProgram {
  name: string;
  suggestedPositions: string[];
  verification: {
    status: string;
    campus: string;
    sourceUrl: string;
    checkedAt: string;
    curriculumStatus: string;
    note: string;
  };
  courses?: Array<{ code: string; title: string; curriculumYear: number; sourceUrl: string; campus: string; checkedAt: string }>;
}

export interface College {
  name: string;
  programs: DegreeProgram[];
}

// Generated data mirrors Backend/data/tip_programs.json; historical choices remain readable.
export const tipManilaPrograms: College[] = catalog;
export const tipManilaCollegePrograms: College[] = tipManilaPrograms
  .filter(college => college.name !== "Senior High School")
  .map(college => ({ ...college, programs: college.programs.filter(program => program.verification.status === "verified") }));
