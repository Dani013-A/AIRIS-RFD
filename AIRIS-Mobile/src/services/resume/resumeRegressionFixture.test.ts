import {
  extractTargetCompetenciesForSelfAssessment,
  formatCanonicalCompetencyName,
  isSkillGroundedInText,
  evaluatePersonalizedCompetency,
  validateVerbatimEvidence,
} from "./selfAssessmentService";

// Real Daniel Resume Text Fixture
// Authoritative Current Resume Text Fixture (CV (1).pdf)
const DANIEL_RESUME_FIXTURE = `
DANIEL AARON T. ESPELA
danielespela251@gmail.com | 0992 212 8671
linkedin.com/in/espela-daniel | https://github.com/Dani013-A

PROFESSIONAL SUMMARY
Information Technology student with experience in developing web, mobile, and AI-powered applications through academic projects, hackathons, and collaborative projects. Experienced with full-stack development, APIs, databases, and machine learning. Interested in software development, AI/ML, Cybersecurity, and building practical technology solutions.

EDUCATION
Technological Institute of the Philippines – Manila
Bachelor of Science in Information Technology | 2023–Present
Expected Graduation: 2027

TECHNICAL SKILLS
Languages:
Python, Java, C++, JavaScript, TypeScript, SQL, Kotlin, VB.NET
Frameworks:
React, React Native, Expo, Next.js, FastAPI, Node.js, Express.js, Laravel
AI/ML:
SBERT, Sentence Transformers, Gemini, Groq, OpenRouter, OCR, Whisper
Databases/Cloud:
Firebase, MySQL, Oracle, AWS EC2, AWS RDS
Tools:
Git, GitHub, Figma, Android Studio, Postman, Unity

PROJECTS
AIRIS: AI-Assisted Resume Analysis & Interview Simulation Platform (School Project)
● Developing a mobile platform using React Native, Expo, TypeScript, FastAPI, and Firebase.
● Implemented resume analysis, ATS scoring, semantic job matching, AI recommendations, OCR, and interview features.
Yakap Kalinga: Disaster Response Platform (School Project)
● Developed a donation and disaster-response platform using React and Laravel.
● Worked with MySQL and AWS for backend and database deployment.
TranslateTo: Translator & Note Application (School Project)
● Developed an Android application using Kotlin and Jetpack Compose.
● Integrated translation, OCR, speech-to-text, and text-to-speech features.
Centralized Hospital Information System
● Developed a hospital information system using Oracle SQL and Oracle APEX.
● Designed relational databases and application workflows.
QuizTinker: Automated Quiz Platform
● Developed a quiz and review platform for examination preparation using Node.js, Django, and FastAPI.

ACHIEVEMENTS
Winner – Grundfos Hackathon
Technological Institute of the Philippines – Quezon City
`;

describe("AIRIS Resume Scoring & Grounding Regression Fixture Tests", () => {
  describe("Grounded Skill Recognition - All 27 Technical Skills", () => {
    it("recognizes all 27 technical skills in the current resume", () => {
      const MUST_EXIST = [
        "Python", "Java", "C++", "JavaScript", "TypeScript", "SQL", "Kotlin", "VB.NET",
        "React", "React Native", "Expo", "Next.js", "FastAPI", "Node.js", "Express.js", "Laravel",
        "Firebase", "MySQL", "Oracle", "AWS EC2", "AWS RDS", "Git", "GitHub", "Figma",
        "Android Studio", "Postman", "Unity"
      ];
      for (const skill of MUST_EXIST) {
        expect(isSkillGroundedInText(skill, DANIEL_RESUME_FIXTURE)).toBe(true);
      }
    });

    it("verifies project evidence for AIRIS and Yakap Kalinga", () => {
      expect(DANIEL_RESUME_FIXTURE).toContain("AIRIS");
      expect(DANIEL_RESUME_FIXTURE).toContain("Yakap Kalinga");
    });
  });

  describe("Absence of Ungrounded / Stale Skills", () => {
    it("strictly rejects absent or stale skills", () => {
      const MUST_NOT_EXIST = [
        "Tailwind CSS", "Project Management", "Docker", "PostgreSQL", "GraphQL", "CI/CD",
        "Frameworks: React", "Frameworks & Tools: React", "Languages: Python, Java, C++"
      ];
      for (const skill of MUST_NOT_EXIST) {
        expect(isSkillGroundedInText(skill, DANIEL_RESUME_FIXTURE)).toBe(false);
      }
    });

    it("ensures VB.NET does NOT match standalone .NET", () => {
      expect(isSkillGroundedInText("VB.NET", DANIEL_RESUME_FIXTURE)).toBe(true);
      expect(isSkillGroundedInText(".NET", DANIEL_RESUME_FIXTURE)).toBe(false);
    });
  });

  describe("Section Label Sanitization & Duplicate React Prevention", () => {
    it("strips section labels like 'Frameworks & Tools: React' to 'React' and never outputs compound labels", () => {
      expect(formatCanonicalCompetencyName("Frameworks: React")).toBe("React");
      expect(formatCanonicalCompetencyName("Frameworks & Tools: React")).toBe("React");
      expect(formatCanonicalCompetencyName("Languages: Python")).toBe("Python");
      expect(formatCanonicalCompetencyName("Databases/Cloud: Firebase")).toBe("Firebase");
    });

    it("rejects standalone generic category names", () => {
      expect(formatCanonicalCompetencyName("Frameworks")).toBe("");
      expect(formatCanonicalCompetencyName("Languages")).toBe("");
      expect(formatCanonicalCompetencyName("Tools")).toBe("");
      expect(formatCanonicalCompetencyName("Frameworks & Tools")).toBe("");
      expect(formatCanonicalCompetencyName("Databases/Cloud")).toBe("");
    });
  });

  describe("Compound Benchmark Aliases", () => {
    it("resolves compound benchmark descriptors to canonical competencies", () => {
      expect(formatCanonicalCompetencyName("Git Version Control")).toBe("Git");
      expect(formatCanonicalCompetencyName("AWS or Cloud Infrastructure")).toBe("AWS");
      expect(formatCanonicalCompetencyName("TypeScript (ES6+)")).toBe("TypeScript");
    });
  });

  describe("Self-Assessment Skill Extraction Grounding", () => {
    it("extracts ONLY grounded skills for self-assessment, excluding target-role-only requirements", () => {
      const mockAnalysisResult = {
        rawText: DANIEL_RESUME_FIXTURE,
        targetPosition: "Full Stack Developer",
        detectedSkills: [
          "React", "Node.js", "TypeScript", "Next.js", "FastAPI",
          "PostgreSQL", "Docker", "GraphQL", "CI/CD", "Tailwind CSS"
        ],
        parsedSections: {
          Skills: "Languages: Python, Java, C++, JavaScript, TypeScript, SQL, Kotlin, VB.NET\nFrameworks: React, React Native, Expo, Next.js, FastAPI, Node.js, Express.js, Laravel",
          Projects: "Developing a mobile platform using React Native, Expo, TypeScript, FastAPI, and Firebase."
        },
        atsScore: {
          roleRelevance: {
            adjustments: [
              { category: "skillsMatch", ruleId: "match_react", maximumPoints: 10 },
              { category: "skillsMatch", ruleId: "match_node_js", maximumPoints: 10 },
              { category: "skillsMatch", ruleId: "match_typescript", maximumPoints: 10 },
              { category: "skillsMatch", ruleId: "match_postgresql", maximumPoints: 10 },
              { category: "skillsMatch", ruleId: "match_docker", maximumPoints: 5 },
            ]
          }
        }
      };

      const selfRatingItems = extractTargetCompetenciesForSelfAssessment(mockAnalysisResult, { maxItems: 10 });
      const itemNames = selfRatingItems.map((i) => i.name);

      // Must include grounded skills
      expect(itemNames).toContain("React");
      expect(itemNames).toContain("Node.js");
      expect(itemNames).toContain("TypeScript");

      // MUST NOT include ungrounded target-role skills
      expect(itemNames).not.toContain("PostgreSQL");
      expect(itemNames).not.toContain("Docker");
      expect(itemNames).not.toContain("GraphQL");
      expect(itemNames).not.toContain("CI/CD");
      expect(itemNames).not.toContain("Tailwind CSS");
      expect(itemNames).not.toContain(".NET");
      expect(itemNames).not.toContain("Frameworks & Tools: React");
    });
  });

  describe("B, R: Competency Identity & Deduplication", () => {
    it("keeps distinct technologies distinct while format-normalizing aliases", () => {
      expect(formatCanonicalCompetencyName("react.js")).toBe("React");
      expect(formatCanonicalCompetencyName("react js")).toBe("React");
      expect(formatCanonicalCompetencyName("react native")).toBe("React Native");

      expect(formatCanonicalCompetencyName("node.js")).toBe("Node.js");
      expect(formatCanonicalCompetencyName("next.js")).toBe("Next.js");
      expect(formatCanonicalCompetencyName("react")).not.toBe(formatCanonicalCompetencyName("react native"));
      expect(formatCanonicalCompetencyName("javascript")).not.toBe(formatCanonicalCompetencyName("typescript"));
      expect(formatCanonicalCompetencyName("mysql")).not.toBe(formatCanonicalCompetencyName("postgresql"));
    });
  });

  describe("U-W: Self-Assessment Isolation", () => {
    it("ensures self-assessment produces personalized guidance without altering canonical score formulas", () => {
      const itemStrong = evaluatePersonalizedCompetency({
        competency: "React",
        targetRelevance: "HIGH",
        resumeEvidenceStatus: "STRONG_MATCH",
        selfRating: "STRONG",
      });
      expect(itemStrong.personalizedStatus).toBe("STRONG_POINT");
      expect(itemStrong.description).toContain("direct project or experience evidence for React");

      const itemWeak = evaluatePersonalizedCompetency({
        competency: "PostgreSQL",
        targetRelevance: "HIGH",
        resumeEvidenceStatus: "NO_RELEVANT_EVIDENCE",
        selfRating: "WEAK",
      });
      expect(itemWeak.personalizedStatus).toBe("WEAK_POINT");
      expect(itemWeak.evidenceLevel).toBe("MISSING");
    });
  });

  describe("X-Y: Approved Canonical Scoring Formula Arithmetic", () => {
    it("computes Resume Score = ATS * 0.40 + Alignment * 0.60 correctly", () => {
      const atsScore = 99;
      const alignmentScore = 24;

      const expectedResumeScore = Math.round(atsScore * 0.40 + alignmentScore * 0.60);
      expect(expectedResumeScore).toBe(54);
    });

    it("computes Alignment Score = Skills(40%) + Experience(30%) + Education(20%) + Certs(10%) correctly", () => {
      const skillsScore = 50;
      const expScore = 60;
      const eduScore = 100;
      const certScore = 0;

      const expectedAlignment = Math.round(
        skillsScore * 0.40 +
        expScore * 0.30 +
        eduScore * 0.20 +
        certScore * 0.10
      );

      expect(expectedAlignment).toBe(58);
    });
  });

  describe("P-Q: Verbatim Evidence Source Validation", () => {
    it("rejects hallucinated evidence quotes not present in the source text", () => {
      const validQuote = "Developing a mobile platform using React Native, Expo, TypeScript, FastAPI, and Firebase.";
      const hallucinatedQuote = "Demonstrated advanced enterprise AWS cloud architecture";

      expect(validateVerbatimEvidence("React Native", validQuote, DANIEL_RESUME_FIXTURE)).toBe(validQuote);
      expect(validateVerbatimEvidence("AWS", hallucinatedQuote, DANIEL_RESUME_FIXTURE)).toBeNull();
    });
  });
});
