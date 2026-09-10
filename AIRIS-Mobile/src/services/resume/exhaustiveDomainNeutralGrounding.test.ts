import { tipManilaPrograms, College, DegreeProgram } from "../../data/tipManilaPrograms";
import {
  isSkillGroundedInText,
  extractTargetCompetenciesForSelfAssessment,
  validateVerbatimEvidence,
} from "./selfAssessmentService";

describe("Exhaustive Domain-Neutral Skill Grounding Validation Matrix", () => {
  beforeEach(() => {
    // Reset mocks/state if needed
  });

  // -------------------------------------------------------------
  // STEP 1: CATALOG ENUMERATION MATRIX TEST
  // -------------------------------------------------------------
  describe("Step 1: Real AIRIS Catalog Enumeration", () => {
    it("enumerates all colleges, programs, and target careers in tipManilaPrograms without gaps", () => {
      expect(tipManilaPrograms.length).toBeGreaterThanOrEqual(5);

      let totalPrograms = 0;
      let totalCareerMappings = 0;

      for (const college of tipManilaPrograms) {
        expect(college.name).toBeTruthy();
        expect(college.programs.length).toBeGreaterThan(0);

        for (const program of college.programs) {
          expect(program.name).toBeTruthy();
          expect(program.suggestedPositions.length).toBeGreaterThan(0);
          totalPrograms++;
          totalCareerMappings += program.suggestedPositions.length;
        }
      }

      expect(totalPrograms).toBe(25);
      expect(totalCareerMappings).toBe(151);
    });
  });

  // -------------------------------------------------------------
  // STEP 3, 4, 5: DOMAIN-NEUTRAL POSITIVE & NEGATIVE EVIDENCE TESTS
  // -------------------------------------------------------------
  describe("Step 3-5: Domain-Specific Grounding Verification across Domain Families", () => {
    const domainFixtures = [
      {
        domain: "BUSINESS / ACCOUNTING",
        college: "College of Business Education",
        program: "BS Accountancy",
        targetCareer: "Certified Public Accountant",
        resumeText: `
          JOHN DOE
          Manila, Philippines | john.doe@email.com | +639171234567
          EDUCATION: BS Accountancy - T.I.P. Manila
          SKILLS: Financial reporting, Excel, Bookkeeping, QuickBooks, Tax preparation
          EXPERIENCE:
          Junior Accountant | ABC Accounting Firm
          - Conducted financial reporting and general bookkeeping for small business clients.
          - Utilized Microsoft Excel and QuickBooks for daily ledger reconciliation and tax preparation.
        `,
        explicitSkills: ["Financial reporting", "Excel", "Bookkeeping", "QuickBooks", "Tax preparation"],
        targetRoleContaminants: ["SAP", "Oracle Financials", "Financial Modeling", "Power BI"],
      },
      {
        domain: "ENGINEERING",
        college: "College of Engineering and Architecture",
        program: "BS Civil Engineering",
        targetCareer: "Structural Engineer",
        resumeText: `
          JANE SMITH
          Manila, Philippines | jane.smith@email.com | +639181234567
          EDUCATION: BS Civil Engineering - T.I.P. Manila
          SKILLS: AutoCAD, SolidWorks, Structural analysis, CAD, Engineering calculations
          EXPERIENCE:
          Civil Engineering Intern | ConstructInc
          - Performed structural analysis and engineering calculations for residential projects.
          - Prepared structural drawings using AutoCAD and CAD tools.
        `,
        explicitSkills: ["AutoCAD", "SolidWorks", "Structural analysis", "CAD", "Engineering calculations"],
        targetRoleContaminants: ["Revit", "STAAD.Pro", "ETABS", "Primavera P6"],
      },
      {
        domain: "ARCHITECTURE",
        college: "College of Engineering and Architecture",
        program: "BS Architecture",
        targetCareer: "Design Architect",
        resumeText: `
          ALEX RIVERA
          Manila, Philippines | alex.rivera@email.com | +639191234567
          EDUCATION: BS Architecture - T.I.P. Manila
          SKILLS: AutoCAD, Revit, SketchUp, Architectural drafting
          EXPERIENCE:
          Architectural Apprentice | ArchiStudio
          - Created architectural drafting layouts and 3D conceptual models using SketchUp and Revit.
          - Produced detailed working floor plans in AutoCAD.
        `,
        explicitSkills: ["AutoCAD", "Revit", "SketchUp", "Architectural drafting"],
        targetRoleContaminants: ["Rhino 3D", "ArchiCAD", "3ds Max", "V-Ray"],
      },
      {
        domain: "PSYCHOLOGY",
        college: "College of Arts",
        program: "Bachelor of Arts in Psychology",
        targetCareer: "Psychometrician",
        resumeText: `
          MARIA SANTOS
          Manila, Philippines | maria.santos@email.com | +639201234567
          EDUCATION: Bachelor of Arts in Psychology - T.I.P. Manila
          SKILLS: Psychological assessment, Research methods, SPSS, Behavioral research
          EXPERIENCE:
          Psychology Assistant | MindCare Center
          - Administered psychological assessment tests and compiled client evaluation reports.
          - Conducted behavioral research and analyzed survey data using SPSS.
        `,
        explicitSkills: ["Psychological assessment", "Research methods", "SPSS", "Behavioral research"],
        targetRoleContaminants: ["R programming", "NVivo", "Neuropsychological Testing", "Cognitive Assessment"],
      },
      {
        domain: "COMPUTER SCIENCE / IT",
        college: "College of Computer Studies",
        program: "BS Computer Science",
        targetCareer: "Software Engineer",
        resumeText: `
          DANIEL ESPELA
          Manila, Philippines | daniel@email.com | +639211234567
          EDUCATION: BS Computer Science - T.I.P. Manila
          SKILLS: Python, Java, SQL, React, Machine learning, Data analysis
          EXPERIENCE:
          Software Developer Intern | TechCorp
          - Built full stack web features using Python, React, and SQL databases.
          - Developed data analysis scripts for machine learning models.
        `,
        explicitSkills: ["Python", "Java", "SQL", "React", "Machine learning", "Data analysis"],
        targetRoleContaminants: ["GraphQL", "PostgreSQL", "MongoDB", "CI/CD"],
      },
    ];

    for (const fx of domainFixtures) {
      it(`correctly grounds explicit skills and blocks contaminants for ${fx.domain} (${fx.program})`, () => {
        // Positive Grounding
        for (const skill of fx.explicitSkills) {
          expect(isSkillGroundedInText(skill, fx.resumeText)).toBe(true);
        }

        // Negative Contamination Prevention
        for (const contaminant of fx.targetRoleContaminants) {
          expect(isSkillGroundedInText(contaminant, fx.resumeText)).toBe(false);
        }
      });
    }
  });

  // -------------------------------------------------------------
  // STEP 6: CROSS-DOMAIN CONTAMINATION PREVENTATIVE TEST
  // -------------------------------------------------------------
  describe("Step 6: Cross-Domain Contamination Matrix", () => {
    it("ensures skills from one domain never leak into resumes of a different domain", () => {
      const engineeringResume = "Skills: AutoCAD, SolidWorks, Structural analysis";
      const businessResume = "Skills: Excel, Bookkeeping, Financial reporting, QuickBooks";
      const psychologyResume = "Skills: SPSS, Psychological assessment, Research methods";
      const itResume = "Skills: Python, React, Node.js, SQL";

      // Engineering resume must not match Business, Psychology, or IT skills
      expect(isSkillGroundedInText("QuickBooks", engineeringResume)).toBe(false);
      expect(isSkillGroundedInText("SPSS", engineeringResume)).toBe(false);
      expect(isSkillGroundedInText("React", engineeringResume)).toBe(false);

      // Business resume must not match Engineering, Psychology, or IT skills
      expect(isSkillGroundedInText("AutoCAD", businessResume)).toBe(false);
      expect(isSkillGroundedInText("SPSS", businessResume)).toBe(false);
      expect(isSkillGroundedInText("Node.js", businessResume)).toBe(false);

      // Psychology resume must not match IT, Business, or Engineering skills
      expect(isSkillGroundedInText("React", psychologyResume)).toBe(false);
      expect(isSkillGroundedInText("QuickBooks", psychologyResume)).toBe(false);
      expect(isSkillGroundedInText("SolidWorks", psychologyResume)).toBe(false);

      // IT resume must not match Business, Engineering, or Psychology skills
      expect(isSkillGroundedInText("Financial reporting", itResume)).toBe(false);
      expect(isSkillGroundedInText("Structural analysis", itResume)).toBe(false);
      expect(isSkillGroundedInText("Psychological assessment", itResume)).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // STEP 7: TARGET-CAREER SWITCHING TEST
  // -------------------------------------------------------------
  describe("Step 7: Target Career Switching Grounding Invariance", () => {
    it("maintains identical detected skills regardless of target career selected", () => {
      const candidateResumeText = `
        DANIEL ESPELA
        BS Computer Science Student
        SKILLS: Python, SQL, Data analysis, React
      `;

      const baseAnalysisPayload = {
        rawText: candidateResumeText,
        detectedSkills: ["Python", "SQL", "Data analysis", "React"],
        parsedSections: {
          Skills: "Python, SQL, Data analysis, React",
          Content: candidateResumeText,
        },
      };

      // Target Role 1: Data Scientist (Role benchmark contains R, Machine Learning, Tableau)
      const dataScientistAnalysis = {
        ...baseAnalysisPayload,
        atsScore: {
          roleRelevance: {
            adjustments: [
              { ruleId: "match_python", category: "skillsMatch", maximumPoints: 10 },
              { ruleId: "match_r_programming", category: "skillsMatch", maximumPoints: 10 },
              { ruleId: "match_tableau", category: "skillsMatch", maximumPoints: 10 },
            ],
          },
        },
      };
      const targets1 = extractTargetCompetenciesForSelfAssessment(dataScientistAnalysis);

      // Target Role 2: Full Stack Developer (Role benchmark contains Node.js, GraphQL, MongoDB)
      const fullStackAnalysis = {
        ...baseAnalysisPayload,
        atsScore: {
          roleRelevance: {
            adjustments: [
              { ruleId: "match_react", category: "skillsMatch", maximumPoints: 10 },
              { ruleId: "match_graphql", category: "skillsMatch", maximumPoints: 10 },
              { ruleId: "match_mongodb", category: "skillsMatch", maximumPoints: 10 },
            ],
          },
        },
      };
      const targets2 = extractTargetCompetenciesForSelfAssessment(fullStackAnalysis);

      const targetNames1 = targets1.map((t) => t.name).sort();
      const targetNames2 = targets2.map((t) => t.name).sort();

      // Detected skills remain strictly grounded in resume evidence
      expect(targetNames1).toContain("Python");
      expect(targetNames1).toContain("SQL");
      expect(targetNames1).not.toContain("GraphQL");
      expect(targetNames1).not.toContain("Mongodb");
      expect(targetNames1).not.toContain("Tableau");

      expect(targetNames2).toContain("Python");
      expect(targetNames2).toContain("React");
      expect(targetNames2).not.toContain("GraphQL");
      expect(targetNames2).not.toContain("Mongodb");
    });
  });

  // -------------------------------------------------------------
  // STEP 8: MOCK LLM HALLUCINATION REJECTION TEST
  // -------------------------------------------------------------
  describe("Step 8: Deterministic Post-AI Hallucination Stripping", () => {
    it("strips AI-hallucinated skills across all academic domains", () => {
      const mockLLMOutputPayload = {
        rawText: "EXPERIENCE: Used MS Excel and Bookkeeping for client accounts.",
        detectedSkills: ["Excel", "Bookkeeping", "SAP", "Oracle", "Python", "React", "SPSS", "AutoCAD"],
        parsedSections: {
          Content: "EXPERIENCE: Used MS Excel and Bookkeeping for client accounts.",
        },
      };

      const groundedTargets = extractTargetCompetenciesForSelfAssessment(mockLLMOutputPayload);
      const targetNames = groundedTargets.map((t) => t.name);

      expect(targetNames).toContain("Excel");
      expect(targetNames).toContain("Bookkeeping");

      expect(targetNames).not.toContain("SAP");
      expect(targetNames).not.toContain("Oracle");
      expect(targetNames).not.toContain("Python");
      expect(targetNames).not.toContain("React");
      expect(targetNames).not.toContain("Spss");
      expect(targetNames).not.toContain("Autocad");
    });
  });

  // -------------------------------------------------------------
  // STEP 9 & 10: ALIAS NORMALIZATION & NON-SEMANTIC INVENTION
  // -------------------------------------------------------------
  describe("Step 9-10: Alias Normalization vs Broad Semantic Expansion Rejection", () => {
    it("accepts valid canonical aliases across domains", () => {
      expect(isSkillGroundedInText("Excel", "Skills: MS Excel")).toBe(true);
      expect(isSkillGroundedInText("Excel", "Skills: Microsoft Excel")).toBe(true);
      expect(isSkillGroundedInText("AutoCAD", "Skills: Auto CAD drafting")).toBe(true);
      expect(isSkillGroundedInText("QuickBooks", "Skills: Quick Books Enterprise")).toBe(true);
      expect(isSkillGroundedInText("Node.js", "Skills: Node backend")).toBe(true);
    });

    it("rejects broad semantic concepts from inventing specific technology names", () => {
      const genericResume = `
        EXPERIENCE:
        - Extensive database experience
        - General programming knowledge
        - Familiar with accounting software
        - Experience with CAD tools
        - Academic research experience
      `;

      // Broad concept MUST NOT invent specific tools
      expect(isSkillGroundedInText("MySQL", genericResume)).toBe(false);
      expect(isSkillGroundedInText("PostgreSQL", genericResume)).toBe(false);
      expect(isSkillGroundedInText("Oracle", genericResume)).toBe(false);
      expect(isSkillGroundedInText("Python", genericResume)).toBe(false);
      expect(isSkillGroundedInText("Java", genericResume)).toBe(false);
      expect(isSkillGroundedInText("QuickBooks", genericResume)).toBe(false);
      expect(isSkillGroundedInText("SAP", genericResume)).toBe(false);
      expect(isSkillGroundedInText("AutoCAD", genericResume)).toBe(false);
      expect(isSkillGroundedInText("SolidWorks", genericResume)).toBe(false);
      expect(isSkillGroundedInText("SPSS", genericResume)).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // STEP 15: EXHAUSTIVE 151 PROGRAM-CAREER MATRIX TEST
  // -------------------------------------------------------------
  describe("Step 15: Programmatic 151 College x Program x Career Matrix Validation", () => {
    it("runs evidence grounding for every supported target career mapping in the catalog", () => {
      let testedCombinations = 0;

      for (const college of tipManilaPrograms) {
        for (const program of college.programs) {
          for (const career of program.suggestedPositions) {
            const neutralResumeText = `
              CANDIDATE NAME
              Degree: ${program.name} - ${college.name}
              Targeting: ${career}
              SKILLS: Communication, Problem Solving, Project Coordination
            `;

            const mockAnalysis = {
              rawText: neutralResumeText,
              detectedSkills: ["Communication", "Problem Solving", "Project Coordination", "GraphQL", "PostgreSQL", "SAP"],
              parsedSections: {
                Content: neutralResumeText,
              },
            };

            const targets = extractTargetCompetenciesForSelfAssessment(mockAnalysis);
            const targetNames = targets.map((t) => t.name.toLowerCase());

            // Grounded skills present in raw text are retained
            expect(targetNames).toContain("communication");
            expect(targetNames).toContain("problem solving");
            expect(targetNames).toContain("project coordination");

            // Un-evidenced contaminants are NEVER retained regardless of career
            expect(targetNames).not.toContain("graphql");
            expect(targetNames).not.toContain("postgresql");
            expect(targetNames).not.toContain("sap");

            testedCombinations++;
          }
        }
      }

      expect(testedCombinations).toBe(151);
    });
  });
});
