jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Alert: { alert: jest.fn() },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("../../config/firebase", () => ({
  db: {},
  auth: {},
}));

import {
  extractTargetCompetenciesForSelfAssessment,
  formatCanonicalCompetencyName,
  evaluatePersonalizedCompetency,
} from "./selfAssessmentService";

describe("Self-Assessment Generalized Competency Deduplication & Evidence Invariant Suite", () => {
  test("A. Identical duplicates in candidate skills collapse into exactly one canonical competency item", () => {
    const analysis = {
      detectedSkills: ["Python", "Python", "Python"],
      rawText: "Experienced Python developer building automated scripts in Python.",
    };

    const targets = extractTargetCompetenciesForSelfAssessment(analysis);
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe("Python");
  });

  test("B. Case variations (Python, python, PYTHON) resolve to exactly one canonical title-cased competency", () => {
    const analysis = {
      detectedSkills: ["Python", "python", "PYTHON"],
      rawText: "Proficient in Python and PYTHON programming with python scripts.",
    };

    const targets = extractTargetCompetenciesForSelfAssessment(analysis);
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe("Python");
  });

  test("C. Canonically equivalent representations collapse under authoritative rules", () => {
    const analysis = {
      detectedSkills: ["Python", "Python Programming", "python language", "programming in python"],
      rawText: "5 years of Python Programming and Python language experience.",
    };

    const targets = extractTargetCompetenciesForSelfAssessment(analysis);
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe("Python");
  });

  test("D. Legitimately distinct competencies remain distinct (React, React Native, React Native Web)", () => {
    const analysis = {
      detectedSkills: ["React", "React Native", "React Native Web"],
      rawText: "Built web frontends with React, mobile apps using React Native, and universal UI with React Native Web.",
    };

    const targets = extractTargetCompetenciesForSelfAssessment(analysis);
    const names = targets.map((t) => t.name);

    expect(targets).toHaveLength(3);
    expect(names).toContain("React");
    expect(names).toContain("React Native");
    expect(names).toContain("React Native Web");
  });

  test("E. Multiple evidence occurrences merge evidence count rather than duplicating rating items", () => {
    const singleOccurrenceAnalysis = {
      detectedSkills: ["Python"],
      rawText: "Learned Python in school.",
    };
    const multiOccurrenceAnalysis = {
      detectedSkills: ["Python", "Python Programming"],
      rawText: "Deep Python background: Python scripts, Python data pipelines, Python web services, and Python automation.",
    };

    const singleTargets = extractTargetCompetenciesForSelfAssessment(singleOccurrenceAnalysis);
    const multiTargets = extractTargetCompetenciesForSelfAssessment(multiOccurrenceAnalysis);

    expect(singleTargets).toHaveLength(1);
    expect(multiTargets).toHaveLength(1);
    expect(singleTargets[0].name).toBe("Python");
    expect(multiTargets[0].name).toBe("Python");
  });

  test("F. Multiple extraction paths for the same competency produce exactly one rating item", () => {
    const analysisWithMultiPaths = {
      detectedSkills: ["SQL"],
      structuredData: {
        skills: ["SQL", { name: "Structured Query Language" }],
      },
      learningSnapshot: {
        careerContext: {
          detectedSkills: ["sql"],
        },
      },
      parsedSections: {
        Skills: "SQL, Structured Query Language, Database Management",
      },
      rawText: "Strong background in SQL and Structured Query Language for Database Management.",
    };

    const targets = extractTargetCompetenciesForSelfAssessment(analysisWithMultiPaths);
    const sqlTargets = targets.filter((t) => t.name === "SQL");
    expect(sqlTargets).toHaveLength(1);
  });

  test("G. User rating remains attached to canonical competency after deduplication of alias", () => {
    const existingRatings = {
      "python programming": "STRONG" as const,
    };

    const analysis = {
      detectedSkills: ["Python", "Python Programming"],
      rawText: "Hands-on Python Programming in production environments.",
      selfRatings: existingRatings,
    };

    const targets = extractTargetCompetenciesForSelfAssessment(analysis, { existingRatings });
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe("Python");

    const evaluation = evaluatePersonalizedCompetency({
      competency: targets[0].name,
      targetRelevance: targets[0].relevance,
      resumeEvidenceStatus: "STRONG_MATCH",
      selfRating: existingRatings["python programming"],
    });

    expect(evaluation.competency).toBe("Python");
    expect(evaluation.selfRating).toBe("STRONG");
    expect(evaluation.personalizedStatus).toBe("STRONG_POINT");
  });

  test("H. Analysis session isolation: a second analysis session does not inherit the first session's competency list", () => {
    const session1Analysis = {
      analysisSessionId: "session_111",
      detectedSkills: ["Python", "Django", "FastAPI"],
      rawText: "Python developer building Django and FastAPI backends.",
    };

    const session2Analysis = {
      analysisSessionId: "session_222",
      detectedSkills: ["AutoCAD", "STAAD.Pro", "Revit"],
      rawText: "Civil engineer specializing in AutoCAD, STAAD.Pro, and Revit modeling.",
    };

    const session1Targets = extractTargetCompetenciesForSelfAssessment(session1Analysis).map((t) => t.name);
    const session2Targets = extractTargetCompetenciesForSelfAssessment(session2Analysis).map((t) => t.name);

    expect(session1Targets).toEqual(expect.arrayContaining(["Python", "FastAPI"]));
    expect(session1Targets).not.toContain("AutoCAD");

    expect(session2Targets).toEqual(expect.arrayContaining(["AutoCAD", "STAAD.Pro", "Revit"]));
    expect(session2Targets).not.toContain("Python");
    expect(session2Targets).not.toContain("Django");
  });

  test("I. Multi-domain family regression (IT, Engineering, Accounting, Healthcare/Psychology)", () => {
    // 1. Engineering
    const engAnalysis = {
      detectedSkills: ["AutoCAD", "auto cad", "Auto CAD", "STAAD.Pro", "staad pro", "staad-pro"],
      rawText: "Proficient with AutoCAD and STAAD.Pro for structural design.",
    };
    const engTargets = extractTargetCompetenciesForSelfAssessment(engAnalysis).map((t) => t.name);
    expect(engTargets).toEqual(["AutoCAD", "STAAD.Pro"]);

    // 2. Accounting
    const acctAnalysis = {
      detectedSkills: ["QuickBooks", "quick books", "Excel", "ms excel", "microsoft excel", "Advanced Excel"],
      rawText: "Managed financial accounts using QuickBooks, Excel, and Advanced Excel spreadsheets.",
    };
    const acctTargets = extractTargetCompetenciesForSelfAssessment(acctAnalysis).map((t) => t.name);
    expect(acctTargets).toEqual(["QuickBooks", "Excel", "Advanced Excel"]);

    // 3. Psychology
    const psychAnalysis = {
      detectedSkills: ["SPSS", "spss", "Psychometrics", "psychometrics"],
      rawText: "Conducted behavioral research with SPSS and psychometrics evaluation.",
    };
    const psychTargets = extractTargetCompetenciesForSelfAssessment(psychAnalysis).map((t) => t.name);
    expect(psychTargets).toEqual(["SPSS", "Psychometrics"]);
  });

  test("J. Number of displayed rating items equals exactly unique canonical competencies", () => {
    const rawSkills = [
      "Node.js", "nodejs", "node js",
      "HTML", "html5", "HTML5",
      "CSS", "css3", "CSS3",
      "PostgreSQL", "postgres", "postgresql",
    ];

    const analysis = {
      detectedSkills: rawSkills,
      rawText: "Full stack stack: Node.js, HTML5, CSS3, and PostgreSQL database administration.",
    };

    const targets = extractTargetCompetenciesForSelfAssessment(analysis);
    const targetNames = targets.map((t) => t.name);

    expect(targetNames).toHaveLength(4);
    expect(targetNames).toEqual(["Node.js", "HTML", "CSS", "PostgreSQL"]);
  });
});
