import { analyzeResume, parseResumeSections } from "./resumeAnalysisEngine";
import { validateResumeNameMatch } from "./resumeNormalizer";

describe("Resume Analysis Engine - Deterministic Tests", () => {
  const TARGET_SW_DEV = "Software Developer";
  const TARGET_DATA_ANALYST = "Data Analyst";

  it("Test Case A: Empty file returns base/low score", () => {
    const result = analyzeResume("   ", TARGET_SW_DEV);
    expect(result.atsScore.overallScore).toBeLessThan(40);
    expect(result.parsedSections.length).toBeLessThan(3);
  });

  it("Test Case B: Gibberish returns low score", () => {
    const result = analyzeResume("asdfghjkl qwertyuiop zxcvbnm", TARGET_SW_DEV);
    expect(result.atsScore.overallScore).toBeLessThan(40);
  });

  it("Test Case C: Poor structure flags PARSING_UNCERTAIN", () => {
    const poorStructure = "John Doe john@email.com I worked at Google for 5 years and went to MIT.";
    const parsed = parseResumeSections(poorStructure);
    expect(parsed.some((s) => s.isUncertain)).toBe(true);
  });

  it("Test Case D: Strong Software Dev match to SW Dev Target -> High Score", () => {
    const resume = `
      John Doe
      john@email.com

      Professional Summary
      Experienced software developer.

      Skills
      JavaScript, Python, Docker, React, Algorithms, Data Structures, System Design, Git

      Work Experience
      Google - Software Developer
      - Developed a dashboard using React and Python that increased user engagement by 20%.
      - Designed system architecture and optimized algorithms for data processing.
      - Used Git and Docker for version control and deployment.

      Education
      MIT - BS Computer Science
    `;
    const result = analyzeResume(resume, TARGET_SW_DEV);
    expect(result.atsScore.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.atsScore.breakdown.skillsMatchScore).toBeGreaterThan(60);
  });

  it("Test Case E: Strong Software Dev match to Data Analyst Target -> Low Relevance", () => {
    const resume = `
      John Doe
      john@email.com

      Professional Summary
      Experienced software developer.

      Skills
      JavaScript, Node, React

      Work Experience
      Google - Software Developer
      - Built a frontend in React that increased speed by 50%.

      Education
      MIT - BS Computer Science
    `;
    const result = analyzeResume(resume, TARGET_DATA_ANALYST);
    // Should score lower than test D because the skills (JS, Node) don't match Data Analyst (SQL, Python, Pandas)
    expect(result.atsScore.breakdown.skillsMatchScore).toBeLessThan(50);
  });

  it("Test Case F: Experience with NO quantifiables -> recommendation generated", () => {
    const resume = `
      John Doe
      john@email.com

      Work Experience
      Software Developer
      - Developed a dashboard using React.
      - Fixed bugs in the backend.

      Education
      MIT
    `;
    const result = analyzeResume(resume, TARGET_SW_DEV);
    const hasQuantWarning = result.suggestions.some((s) => s.title.includes("Quantifiable"));
    expect(hasQuantWarning).toBe(true);
  });

  it("Test Case G: Experience WITH quantifiables -> extra points", () => {
    const resume = `
      John Doe
      john@email.com

      Work Experience
      Software Developer
      - Developed a dashboard using React that reduced reporting time by 20%.

      Education
      MIT
    `;
    const result = analyzeResume(resume, TARGET_SW_DEV);
    // Should have experience points bumped up by quantifiable rule
    const rule = result.atsScore.adjustments?.find((a) => a.ruleId === "content_quantified");
    expect(rule).toBeDefined();
    expect(rule?.passed).toBe(true);
  });

  it("Test Case J: Missing Education section is tracked", () => {
    const resume = `
      John Doe
      john@email.com

      Skills
      JavaScript, Python

      Work Experience
      Developer
    `;
    const result = analyzeResume(resume, TARGET_SW_DEV);
    const missingEdu = result.missingSections.find((m) => m.name === "Education");
    expect(missingEdu).toBeDefined();
    expect(missingEdu?.requirement).toBe("required");
  });

  describe("Resume Name Matching Validation - Production Assertions", () => {
    it("Daniel Tan / Daniel S. Tan -> MATCHED", () => {
      const res = validateResumeNameMatch("Daniel Tan", "Daniel S. Tan\nBS Computer Science\ndaniel@example.com");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("MATCHED");
    });

    it("Daniel Tan / Tan, Daniel -> MATCHED", () => {
      const res = validateResumeNameMatch("Daniel Tan", "Tan, Daniel\nBS Computer Science\ndaniel@example.com");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("MATCHED");
    });

    it("Daniel Tan / Daniel Santos -> CONFLICT (must NOT be MATCHED)", () => {
      const res = validateResumeNameMatch("Daniel Tan", "Daniel Santos\nBS Computer Science\ndaniel@example.com");
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("CONFLICT");
      expect(res.reason).toContain("different individual");
    });

    it("Daniel Tan / Maria Santos -> CONFLICT", () => {
      const res = validateResumeNameMatch("Daniel Tan", "Maria Santos\nBS Accountancy\nmaria@example.com");
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("CONFLICT");
      expect(res.reason).toContain("different individual");
    });

    it("Daniel Tan / no identifiable name -> UNABLE_TO_VERIFY", () => {
      const res = validateResumeNameMatch(
        "Daniel Tan",
        "OBJECTIVE:\nSeeking software developer internship...\nSKILLS:\nJavaScript, React, Node.js"
      );
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("UNABLE_TO_VERIFY");
    });

    it("Juan Dela Cruz / Juan Dela Cruz Jr. -> MATCHED", () => {
      const res = validateResumeNameMatch("Juan Dela Cruz", "Juan Dela Cruz Jr.\nBS Information Technology");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("MATCHED");
    });

    it("Juan Dela Cruz / Dela Cruz, Juan -> MATCHED", () => {
      const res = validateResumeNameMatch("Juan Dela Cruz", "Dela Cruz, Juan\nBS Information Technology");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("MATCHED");
    });
  });
});
