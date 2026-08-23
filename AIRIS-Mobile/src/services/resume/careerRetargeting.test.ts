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
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, forEach: () => {} })),
  setDoc: jest.fn(),
  writeBatch: jest.fn(() => ({ set: jest.fn(), commit: jest.fn() })),
}));

import { analyzeResume } from "./resumeAnalysisEngine";
import {
  matchLearningRecommendations,
} from "../learning/learningCatalogService";

describe("Career Re-Targeting - Multi-Role Dynamic Transitions", () => {
  const sampleResumeText = `
    JUAN DELA CRUZ
    juan.delacruz@tip.edu.ph | Manila, Philippines

    EDUCATION
    Technological Institute of the Philippines - Manila
    Bachelor of Science in Information Technology | Graduation: 2026

    SKILLS
    Python, SQL, JavaScript, React, HTML, CSS, Git, Problem Solving, Data Analysis

    WORK EXPERIENCE
    Tech Solutions Manila - Technical Intern
    - Built responsive web dashboards using React and JavaScript.
    - Queried relational databases using SQL to extract weekly metrics.
    - Collaborated with senior engineers using Git workflows.

    PROJECTS
    Automated Data Processing Script - Lead Developer
    - Created Python automation scripts to parse CSV reports.
  `;

  it("1. Analyzes resume for Data Analyst -> yields data analytics focus", () => {
    const analysis = analyzeResume(sampleResumeText, "Data Analyst");
    expect(analysis.atsScore.overallScore).toBeGreaterThan(0);

    const recs = matchLearningRecommendations({
      targetPosition: "Data Analyst",
      skillGaps: [{ skill: "Time Series Forecasting", importance: "high" }],
      detectedSkills: ["python", "sql", "data analysis"],
      categoryId: "for_you",
    });

    expect(recs.length).toBeGreaterThan(0);
    // Should prioritize data analytics resources
    const hasDataRec = recs.some((r) =>
      r.careerPaths.includes("data analyst") || r.skills.some((s) => s.includes("data") || s.includes("sql"))
    );
    expect(hasDataRec).toBe(true);

    // Should NOT have cybersecurity or mobile resources at top
    expect(recs[0].careerPaths).not.toContain("cybersecurity analyst");
  });

  it("2. Switches target to Software Engineer -> yields software engineering focus", () => {
    const analysis = analyzeResume(sampleResumeText, "Software Engineer");
    expect(analysis.atsScore.overallScore).toBeGreaterThan(0);

    const recs = matchLearningRecommendations({
      targetPosition: "Software Engineer",
      skillGaps: [{ skill: "Software Testing & Automation", importance: "high" }],
      detectedSkills: ["javascript", "react", "git", "python"],
      categoryId: "for_you",
    });

    expect(recs.length).toBeGreaterThan(0);
    // Should prioritize software engineering resources
    const hasSWE = recs.some((r) =>
      r.careerPaths.includes("software engineer") || r.skills.some((s) => s.includes("react") || s.includes("git"))
    );
    expect(hasSWE).toBe(true);
  });

  it("3. Switches target to Cybersecurity Analyst -> yields cybersecurity focus", () => {
    const analysis = analyzeResume(sampleResumeText, "Cybersecurity Analyst");
    expect(analysis.atsScore.overallScore).toBeGreaterThan(0);

    const recs = matchLearningRecommendations({
      targetPosition: "Cybersecurity Analyst",
      skillGaps: [{ skill: "Network Security & Threat Analysis", importance: "high" }],
      detectedSkills: ["python", "sql"],
      categoryId: "for_you",
    });

    expect(recs.length).toBeGreaterThan(0);
    // Top direct gap matches should include cybersecurity certifications/guides
    const hasCyber = recs.some((r) =>
      r.careerPaths.includes("cybersecurity analyst") || r.skills.some((s) => s.includes("security"))
    );
    expect(hasCyber).toBe(true);
  });

  it("4. Switches target to UI/UX Designer -> yields UI/UX focus", () => {
    const analysis = analyzeResume(sampleResumeText, "UI/UX Designer");
    expect(analysis.atsScore.overallScore).toBeGreaterThan(0);

    const recs = matchLearningRecommendations({
      targetPosition: "UI/UX Designer",
      skillGaps: [{ skill: "User Research & Prototyping", importance: "high" }],
      detectedSkills: ["html", "css"],
      categoryId: "for_you",
    });

    expect(recs.length).toBeGreaterThan(0);
    const hasUX = recs.some((r) =>
      r.careerPaths.includes("ui/ux designer") || r.skills.some((s) => s.includes("ux") || s.includes("design"))
    );
    expect(hasUX).toBe(true);
  });

  it("5. Switches back to Data Analyst -> seamlessly returns to Data Analyst focus", () => {
    const recs = matchLearningRecommendations({
      targetPosition: "Data Analyst",
      skillGaps: [{ skill: "SQL Performance Tuning", importance: "high" }],
      detectedSkills: ["python", "sql", "data analysis"],
      categoryId: "for_you",
    });

    expect(recs.length).toBeGreaterThan(0);
    const topRec = recs[0];
    expect(
      topRec.careerPaths.includes("data analyst") ||
      topRec.careerPaths.includes("all tech roles")
    ).toBe(true);
  });
});
