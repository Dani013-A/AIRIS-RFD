import {
  isSkillGroundedInText,
  extractTargetCompetenciesForSelfAssessment,
} from "./selfAssessmentService";

describe("Deterministic Skill Evidence Grounding & Persistence Unit Tests", () => {
  const RESUME_FIXTURE = `
    DANIEL AARON T. ESPELA
    Software Engineer | Manila, Philippines
    Skills: Python, Java, C++, JavaScript, TypeScript, SQL, Kotlin, VB.NET, React,
    React Native, Expo, Next.js, FastAPI, Node.js, Express.js, Laravel, SBERT,
    Sentence Transformers, Gemini, Groq, OpenRouter, OCR, Whisper, Firebase,
    MySQL, Oracle, AWS EC2, AWS RDS, Git, GitHub, Figma, Android Studio, Postman, Unity
    Experience: Developed scalable full-stack web and mobile systems.
  `;

  test("1. Resume explicitly says JavaScript -> JavaScript detected", () => {
    expect(isSkillGroundedInText("JavaScript", "Skills: JavaScript, HTML, CSS")).toBe(true);
  });

  test("2. Resume explicitly says React -> React detected", () => {
    expect(isSkillGroundedInText("React", "Skills: React, Redux")).toBe(true);
  });

  test("3. Resume explicitly says MySQL -> MySQL detected", () => {
    expect(isSkillGroundedInText("MySQL", "Skills: MySQL, SQL")).toBe(true);
  });

  test("4. Resume says SQL only -> SQL detected; MySQL and PostgreSQL NOT automatically detected", () => {
    const text = "Skills: SQL, Python, Git";
    expect(isSkillGroundedInText("SQL", text)).toBe(true);
    expect(isSkillGroundedInText("MySQL", text)).toBe(false);
    expect(isSkillGroundedInText("PostgreSQL", text)).toBe(false);
  });

  test("5. Resume says React -> Next.js NOT automatically detected", () => {
    const text = "Skills: React, HTML, CSS";
    expect(isSkillGroundedInText("React", text)).toBe(true);
    expect(isSkillGroundedInText("Next.js", text)).toBe(false);
  });

  test("6. Resume says JavaScript -> GraphQL NOT automatically detected", () => {
    const text = "Skills: JavaScript, Node.js";
    expect(isSkillGroundedInText("JavaScript", text)).toBe(true);
    expect(isSkillGroundedInText("GraphQL", text)).toBe(false);
  });

  test("7. Resume says Node.js -> Express.js NOT automatically detected unless separately evidenced", () => {
    const text = "Skills: Node.js, MongoDB";
    expect(isSkillGroundedInText("Node.js", text)).toBe(true);
    expect(isSkillGroundedInText("Express.js", text)).toBe(false);
  });

  test("8. Resume says REST APIs -> GraphQL NOT automatically detected", () => {
    const text = "Skills: REST API, Express.js";
    expect(isSkillGroundedInText("REST API", text)).toBe(true);
    expect(isSkillGroundedInText("GraphQL", text)).toBe(false);
  });

  test("9. Resume contains no PostgreSQL -> PostgreSQL NOT detected", () => {
    expect(isSkillGroundedInText("PostgreSQL", RESUME_FIXTURE)).toBe(false);
  });

  test("10. Resume contains no MongoDB -> MongoDB NOT detected", () => {
    expect(isSkillGroundedInText("MongoDB", RESUME_FIXTURE)).toBe(false);
  });

  test("11. Resume contains no CI/CD -> CI/CD NOT detected", () => {
    expect(isSkillGroundedInText("CI/CD", RESUME_FIXTURE)).toBe(false);
  });

  test("12-14. Target career Full Stack Developer does NOT inject GraphQL, PostgreSQL, or MongoDB into detected skills", () => {
    const mockAnalysis = {
      rawText: RESUME_FIXTURE,
      detectedSkills: ["JavaScript", "React", "Node.js", "MySQL", "GraphQL", "PostgreSQL", "MongoDB", "CI/CD"],
      structuredData: { skills: [] },
      atsScore: { roleRelevance: { adjustments: [] } }
    };

    const targets = extractTargetCompetenciesForSelfAssessment(mockAnalysis);
    const targetNames = targets.map((t) => t.name.toLowerCase());

    expect(targetNames).toContain("javascript");
    expect(targetNames).toContain("react");
    expect(targetNames).toContain("mysql");

    expect(targetNames).not.toContain("graphql");
    expect(targetNames).not.toContain("postgresql");
    expect(targetNames).not.toContain("mongodb");
    expect(targetNames).not.toContain("ci/cd");
  });

  test("15-18. Grounding rejects unevidenced skills from LLM / learning recommendation leakage", () => {
    const mockAnalysis = {
      rawText: "Skills: Python, FastAPI, SQL, Docker",
      detectedSkills: ["Python", "FastAPI", "SQL", "Docker", "GraphQL", "PostgreSQL"],
    };

    const targets = extractTargetCompetenciesForSelfAssessment(mockAnalysis);
    const names = targets.map((t) => t.name);

    expect(names).toContain("Python");
    expect(names).toContain("FastAPI");
    expect(names).toContain("SQL");
    expect(names).toContain("Docker");

    expect(names).not.toContain("GraphQL");
    expect(names).not.toContain("PostgreSQL");
  });

  test("19. Real Regression Test on Provided Resume Fixture", () => {
    const mockAnalysis = {
      rawText: RESUME_FIXTURE,
      detectedSkills: [
        "Python", "Java", "C++", "JavaScript", "TypeScript", "SQL", "Kotlin", "VB.NET",
        "React", "React Native", "Expo", "Next.js", "FastAPI", "Node.js", "Express.js",
        "Laravel", "SBERT", "Sentence Transformers", "Gemini", "Groq", "OpenRouter",
        "OCR", "Whisper", "Firebase", "MySQL", "Oracle", "AWS EC2", "AWS RDS", "Git",
        "GitHub", "Figma", "Android Studio", "Postman", "Unity",
        "GraphQL", "PostgreSQL", "MongoDB", "CI/CD"
      ]
    };

    const targets = extractTargetCompetenciesForSelfAssessment(mockAnalysis, { maxItems: 50 });
    const targetNames = targets.map((t) => t.name.toLowerCase());

    // Explicitly assert present skills
    expect(targetNames).toContain("python");
    expect(targetNames).toContain("react");
    expect(targetNames).toContain("mysql");
    expect(targetNames).toContain("fastapi");

    // Explicitly assert un-evidenced skills are REJECTED
    expect(targetNames).not.toContain("graphql");
    expect(targetNames).not.toContain("postgresql");
    expect(targetNames).not.toContain("mongodb");
    expect(targetNames).not.toContain("ci/cd");
  });
});
