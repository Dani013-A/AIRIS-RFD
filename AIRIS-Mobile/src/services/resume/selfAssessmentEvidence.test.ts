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
  validateVerbatimEvidence,
  evaluatePersonalizedCompetency,
} from "./selfAssessmentService";

describe("Resume-Grounded Self-Assessment & Evidence Integrity Strict Audit Suite", () => {
  test("A. Resume skill grounding: Only resume-supported skills are presented; 0 target-role skills injected", () => {
    const mockAnalysis = {
      detectedSkills: ["Python", "JavaScript", "Java"],
      structuredData: {
        skills: ["Python", "JavaScript", "Java"],
      },
      atsScore: {
        roleRelevance: {
          adjustments: [
            { ruleId: "match_relational_and_nosql_databases", maximumPoints: 10 },
            { ruleId: "match_aws_cloud_architecture", maximumPoints: 10 },
            { ruleId: "match_kubernetes_container_orchestration", maximumPoints: 10 },
          ],
        },
      },
    };

    const targets = extractTargetCompetenciesForSelfAssessment(mockAnalysis);
    const targetNames = targets.map((t) => t.name);

    expect(targetNames).toContain("Python");
    expect(targetNames).toContain("JavaScript");
    expect(targetNames).toContain("Java");
    expect(targetNames).not.toContain("Relational And Nosql Databases");
    expect(targetNames).not.toContain("Aws Cloud Architecture");
    expect(targetNames).not.toContain("Kubernetes Container Orchestration");
  });

  test("B. Empty extracted skills: Returns empty list without injecting target-role benchmark skills", () => {
    const mockAnalysis = {
      detectedSkills: [],
      structuredData: { skills: [] },
      atsScore: {
        roleRelevance: {
          adjustments: [
            { ruleId: "match_relational_and_nosql_databases", maximumPoints: 10 },
          ],
        },
      },
    };

    const targets = extractTargetCompetenciesForSelfAssessment(mockAnalysis);
    expect(targets).toHaveLength(0);
  });

  test("C. Exact source evidence & terminology equivalence (React in resume for React.js competency)", () => {
    const rawResumeText = "Developed responsive web application interface using React and Redux.";
    const quote = "Developed responsive web application interface using React and Redux.";

    const verified = validateVerbatimEvidence("React.js", quote, rawResumeText);
    expect(verified).toBe(quote);
  });

  test("D. Wrong evidence (Seismic/wind load calculation quote for JavaScript competency) is rejected", () => {
    const rawResumeText = "Performed seismic and wind load calculations in accordance with NSCP 2015. Developed mobile apps in JavaScript.";
    const structuralQuote = "Performed seismic and wind load calculations in accordance with NSCP 2015";

    const verified = validateVerbatimEvidence("JavaScript", structuralQuote, rawResumeText);
    expect(verified).toBeNull();
  });

  test("E. Wrong evidence (Concrete pouring quote for Express.js competency) is rejected", () => {
    const rawResumeText = "Inspected concrete pouring and rebar installation on site. Built Express.js APIs.";
    const civilQuote = "Inspected concrete pouring and rebar installation on site";

    const verified = validateVerbatimEvidence("Express.js", civilQuote, rawResumeText);
    expect(verified).toBeNull();
  });

  test("F. Hallucinated quote not present in raw resume text is rejected", () => {
    const rawResumeText = "Experienced Python developer working on backend APIs.";
    const fakeQuote = "Designed global microservices architecture serving 10M daily active users.";

    const verified = validateVerbatimEvidence("Python", fakeQuote, rawResumeText);
    expect(verified).toBeNull();
  });

  test("G. Source quote containing competency is verified without requiring fixed action verbs", () => {
    const rawResumeText = "Coordinated with the JavaScript team to receive weekly progress updates.";
    const validQuote = "Coordinated with the JavaScript team to receive weekly progress updates.";

    const verified = validateVerbatimEvidence("JavaScript", validQuote, rawResumeText);
    expect(verified).toBe(validQuote);
  });

  test("H. Multiple supported skills (>10 skills) intelligently prioritized to Top 10", () => {
    const twelveSkills = [
      "Python", "JavaScript", "Java", "C++", "SQL", "PostgreSQL",
      "React.js", "Node.js", "Docker", "Git", "HTML", "CSS"
    ];

    const mockAnalysis = {
      detectedSkills: twelveSkills,
      targetPosition: "Full Stack Developer",
    };

    const targets = extractTargetCompetenciesForSelfAssessment(mockAnalysis);
    expect(targets).toHaveLength(10);

    // If candidate has <= 10 skills, all are presented
    const sixSkillsAnalysis = {
      detectedSkills: ["Python", "JavaScript", "Java", "C++", "SQL", "Git"],
    };
    const sixTargets = extractTargetCompetenciesForSelfAssessment(sixSkillsAnalysis);
    expect(sixTargets).toHaveLength(6);
  });

  test("I. Domain neutrality across Civil Engineering, Accountancy, and Psychology", () => {
    const civilAnalysis = {
      detectedSkills: ["AutoCAD", "STAAD.Pro", "Structural Analysis", "Quantity Estimation"],
    };
    const civilTargets = extractTargetCompetenciesForSelfAssessment(civilAnalysis).map((t) => t.name);
    expect(civilTargets).toEqual(["AutoCAD", "STAAD.Pro", "Structural Analysis", "Quantity Estimation"]);

    const acctAnalysis = {
      detectedSkills: ["Financial Accounting", "Bookkeeping", "Internal Audit"],
    };
    const acctTargets = extractTargetCompetenciesForSelfAssessment(acctAnalysis).map((t) => t.name);
    expect(acctTargets).toEqual(["Financial Accounting", "Bookkeeping", "Internal Audit"]);

    const psychAnalysis = {
      detectedSkills: ["Psychometrics", "SPSS", "Psychological Assessment"],
    };
    const psychTargets = extractTargetCompetenciesForSelfAssessment(psychAnalysis).map((t) => t.name);
    expect(psychTargets).toEqual(["Psychometrics", "SPSS", "Psychological Assessment"]);
  });

  test("J. Self-assessment ratings update guidance without mutating ATS score", () => {
    const initialScore = 85;
    const atsScoreObj = { overallScore: initialScore, roleRelevance: { total: 80 } };

    const evaluation = evaluatePersonalizedCompetency({
      competency: "Python",
      targetRelevance: "HIGH",
      resumeEvidenceStatus: "STRONG_MATCH",
      selfRating: "WEAK",
    });

    expect(evaluation.personalizedStatus).toBe("CONFIDENCE_MISMATCH");
    expect(evaluation.headline).toBe("STRONG EVIDENCE - LOW CONFIDENCE");
    expect(atsScoreObj.overallScore).toBe(85);
  });

  test("K. Duplicate competency aliases (.NET and NET) collapse into single canonical competency", () => {
    const mockAnalysis = {
      detectedSkills: [".NET", "NET", "dotnet", "VB.NET", "React", "React.js", "ReactJS"],
    };
    const targets = extractTargetCompetenciesForSelfAssessment(mockAnalysis);
    const names = targets.map((t) => t.name);
    // .NET, NET, dotnet must collapse to one .NET
    expect(names.filter((n) => n === ".NET")).toHaveLength(1);
    // React, React.js, ReactJS must collapse to one React
    expect(names.filter((n) => n === "React")).toHaveLength(1);
    expect(names).toContain("VB.NET");
  });
});
