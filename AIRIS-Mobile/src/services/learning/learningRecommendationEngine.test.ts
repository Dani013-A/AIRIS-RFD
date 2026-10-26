import { withReviewedFixtureMetadata, matchingTestCatalog } from "./reviewedTestFixtures";
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

import {
  matchLearningRecommendations,
  getGrowthPathRecommendations,
  evaluateGapMatch,
  normalizeGap,
  extractResumeCredentialProfile,
  isResourceDemotedForSkillDepth,
} from "./learningCatalogService";
import { LearningResource } from "../../types/learning.types";

describe("Learning Recommendation Engine - Production Readiness Invariants", () => {
  // Test A: Shared skill must not dominate
  test("Test A: Shared skill must not dominate compound gaps (Ansible/Automation outranks generic Python/ML)", () => {
    const customCatalog: LearningResource[] = [
      {
        id: "course_generic_python",
        title: "Python for Beginners",
        description: "Introductory Python programming fundamentals.",
        type: "course",
        category: "for_you",
        provider: "Coursera",
        url: "https://www.coursera.org/learn/python-basics-intro",
        level: "beginner",
        skills: ["python"],
        careerPaths: ["software engineer"],
        tags: ["python"],
        priority: 50,
        isActive: true,
        isVerified: true,
      },
      {
        id: "course_ml_specialization",
        title: "Machine Learning Specialization",
        description: "Machine learning theory, algorithms, and deep neural nets.",
        type: "course",
        category: "for_you",
        provider: "DeepLearning.AI",
        url: "https://www.coursera.org/specializations/machine-learning-introduction",
        level: "intermediate",
        skills: ["machine learning", "python", "scikit-learn"],
        careerPaths: ["machine learning engineer", "data scientist"],
        tags: ["machine learning"],
        priority: 50,
        isActive: true,
        isVerified: true,
      },
      {
        id: "course_ansible_automation",
        title: "Automating Linux Infrastructure with Ansible",
        description: "Infrastructure automation, playbooks, and configuration management.",
        type: "course",
        category: "for_you",
        provider: "Red Hat",
        url: "https://www.redhat.com/en/services/training/do007-ansible-essentials-simplicity-automation-technical-overview",
        level: "intermediate",
        skills: ["ansible", "linux", "automation"],
        careerPaths: ["information technology specialist", "system administrator", "devops engineer"],
        tags: ["ansible", "automation"],
        priority: 50,
        isActive: true,
        isVerified: true,
      },
      {
        id: "course_it_automation_python",
        title: "Google IT Automation with Python",
        description: "Python automation for IT support, bash scripting, and administration.",
        type: "course",
        category: "for_you",
        provider: "Google",
        url: "https://www.coursera.org/professional-certificates/google-it-automation",
        level: "intermediate",
        skills: ["python", "automation", "bash", "system administration"],
        careerPaths: ["information technology specialist", "it support specialist", "system administrator"],
        tags: ["python", "automation"],
        priority: 60,
        isActive: true,
        isVerified: true,
      },
    ];

    const recs = matchLearningRecommendations({
      targetPosition: "Information Technology Specialist",
      skillGaps: [{ skill: "Automation with Python and Ansible", importance: "high" }],
      detectedSkills: ["Python", "Java", "SQL"],
      rawResumeText: "Experienced in Python programming, web development, SQL.",
      customCatalog: withReviewedFixtureMetadata(customCatalog),
    });

    expect(recs.length).toBeGreaterThan(0);
    const topResourceIds = recs.map((r) => r.id);

    // Automation/Ansible resources must outrank generic ML or beginner Python courses
    const ansibleIdx = topResourceIds.indexOf("course_ansible_automation");
    const itAutoIdx = topResourceIds.indexOf("course_it_automation_python");
    const mlIdx = topResourceIds.indexOf("course_ml_specialization");

    expect(ansibleIdx).toBeGreaterThanOrEqual(0);
    expect(itAutoIdx).toBeGreaterThanOrEqual(0);
    if (mlIdx >= 0) {
      expect(ansibleIdx).toBeLessThan(mlIdx);
      expect(itAutoIdx).toBeLessThan(mlIdx);
    }
  });

  // Test B: Role relevance matters
  test("Test B: Resource with roleRelevance = NO must not be Tier 2 Role Competency", () => {
    const mlCourse: LearningResource = {
      id: "course_ml_spec",
      title: "Machine Learning Specialization",
      description: "Machine learning algorithms and models.",
      type: "course",
      category: "for_you",
      provider: "Coursera",
      url: "https://www.coursera.org/specializations/machine-learning-introduction",
      level: "intermediate",
      skills: ["machine learning", "python"],
      careerPaths: ["machine learning engineer", "data scientist"],
      tags: ["machine learning"],
      priority: 50,
      isActive: true,
      isVerified: true,
    };

    const recs = matchLearningRecommendations({
      targetPosition: "Information Technology Specialist",
      skillGaps: [{ skill: "IT Infrastructure Automation", importance: "high" }],
      detectedSkills: ["Python", "JavaScript"],
      rawResumeText: "Proficient in Python, React, JavaScript.",
      customCatalog: withReviewedFixtureMetadata([mlCourse]),
    });

    // Since ML Specialization careerPaths are ML Engineer/Data Scientist and primary role is IT Specialist,
    // it must not be promoted to TIER_2_ROLE_COMPETENCY for IT Infrastructure Automation
    const mlRec = recs.find((r) => r.id === "course_ml_spec");
    if (mlRec) {
      expect(mlRec.relevanceTier).not.toBe("TIER_2_ROLE_COMPETENCY");
      expect(mlRec.relevanceTier).not.toBe("TIER_1_DIRECT_GAP");
    }
  });

  // Test C: Direct gap wins over generic skill
  test("Test C: Direct gap resource wins over generic technology skill", () => {
    const recs = matchLearningRecommendations({
      customCatalog: matchingTestCatalog(),
      targetPosition: "Information Technology Specialist",
      skillGaps: [{ skill: "Network Administration", importance: "high" }],
      detectedSkills: ["Python", "JavaScript", "HTML"],
    });

    expect(recs.length).toBeGreaterThan(0);
    const topRec = recs[0];
    expect(topRec.relevanceTier).toBe("TIER_1_DIRECT_GAP");
    // Top recommendation should address networking directly
    expect(topRec.matchedSkillGap?.toLowerCase()).toContain("network");
  });

  // Test D: Gap diversity
  test("Test D: Gap diversity ensures top recommendations distribute across distinct gaps", () => {
    const recs = matchLearningRecommendations({
      customCatalog: matchingTestCatalog(),
      targetPosition: "Information Technology Specialist",
      skillGaps: [
        { skill: "Network Administration", importance: "high" },
        { skill: "System Administration", importance: "high" },
        { skill: "Cloud Infrastructure", importance: "high" },
        { skill: "Active Directory", importance: "medium" },
      ],
      detectedSkills: ["Python", "Java", "SQL"],
    });

    const top5 = recs.slice(0, 5);
    const matchedGapsInTop5 = new Set(top5.map((r) => r.matchedSkillGap).filter(Boolean));

    // Must cover at least 2 distinct gaps in top 5, not monopolized by just 1
    expect(matchedGapsInTop5.size).toBeGreaterThanOrEqual(2);
  });

  // Test E: Type diversity
  test("Test E: GrowthPath recommendations distribute across certs, courses, and practical learning without empty filler", () => {
    const growth = getGrowthPathRecommendations({
      customCatalog: matchingTestCatalog(),
      targetPosition: "Information Technology Specialist",
      degreeProgram: "BS Information Technology",
      collegeDomain: "Engineering and Information Technology",
      activeAnalysis: {
        detectedSkills: ["Python", "Java", "C++", "SQL"],
        learningSnapshot: {
          skillGaps: [
            { skill: "Network Administration", importance: "high" },
            { skill: "System Administration", importance: "high" },
            { skill: "Cloud Infrastructure", importance: "high" },
          ],
        },
      },
    });

    expect(growth.certifications.length).toBeGreaterThan(0);
    expect(growth.certifications.length).toBeLessThanOrEqual(3);
    expect(growth.courses.length).toBeGreaterThan(0);
    expect(growth.courses.length).toBeLessThanOrEqual(3);
    expect(growth.practicalLearning.length).toBeLessThanOrEqual(3);

    // Each certification must genuinely be of type certification
    growth.certifications.forEach((c) => expect(c.type).toBe("certification"));
    // Each course must genuinely be of type course
    growth.courses.forEach((c) => expect(c.type).toBe("course"));
  });

  // Test F: Candidate-owned skill demotion
  test("Test F: Candidate-owned skill beginner tutorials are demoted when candidate already has that skill", () => {
    const profile = extractResumeCredentialProfile(
      "Extensive experience in Python development and software engineering.",
      undefined,
      ["Python"]
    );
    const beginnerPythonCourse: LearningResource = {
      id: "course_python_beginner",
      title: "Python for Beginners",
      description: "Basic introduction to Python.",
      type: "course",
      category: "for_you",
      provider: "Coursera",
      url: "https://www.coursera.org/learn/python-basics-intro",
      level: "beginner",
      skills: ["python"],
      careerPaths: ["software engineer"],
      tags: ["python"],
      priority: 50,
      isActive: true,
      isVerified: true,
    };

    const gaps = [
      normalizeGap("Automation with Python and Ansible", "high"),
      normalizeGap("Network Administration", "high"),
    ];

    const isDemoted = isResourceDemotedForSkillDepth(beginnerPythonCourse, profile, gaps);
    expect(isDemoted).toBe(true);
  });

  // Test H: Determinism
  test("Test H: Recommendations are strictly deterministic given the same inputs", () => {
    const input = {
      targetPosition: "Information Technology Specialist",
      degreeProgram: "BS Information Technology",
      collegeDomain: "Engineering and Information Technology",
      skillGaps: [
        { skill: "Network Administration", importance: "high" },
        { skill: "System Administration", importance: "high" },
        { skill: "Linux Administration", importance: "high" },
      ],
      detectedSkills: ["Python", "Java", "SQL", "React"],
    };

    const run1 = matchLearningRecommendations(input);
    const run2 = matchLearningRecommendations(input);

    expect(run1.length).toBe(run2.length);
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].id).toBe(run2[i].id);
      expect(run1[i].relevanceScore).toBe(run2[i].relevanceScore);
      expect(run1[i].relevanceTier).toBe(run2[i].relevanceTier);
      expect(run1[i].recommendationReason).toBe(run2[i].recommendationReason);
    }
  });

  // Cross-Career Generalization Tests
  describe("Cross-Career Generalization", () => {
    test("Data Science: prioritizes data and ML gaps over IT support", () => {
      const recs = matchLearningRecommendations({
        customCatalog: matchingTestCatalog(),
      targetPosition: "Data Scientist",
        degreeProgram: "BS Computer Science",
        skillGaps: [
          { skill: "Machine Learning", importance: "high" },
          { skill: "Predictive Modeling", importance: "high" },
          { skill: "Data Visualization", importance: "medium" },
        ],
        detectedSkills: ["Python", "SQL"],
      });

      expect(recs.length).toBeGreaterThan(0);
      const topRec = recs[0];
      expect(topRec.relevanceTier).toBe("TIER_1_DIRECT_GAP");
      expect(
        topRec.matchedCompetency?.toLowerCase().includes("machine learning") ||
        topRec.matchedCompetency?.toLowerCase().includes("predictive") ||
        topRec.matchedCompetency?.toLowerCase().includes("data")
      ).toBe(true);
    });

    test("Cybersecurity: prioritizes security and network analysis over web development", () => {
      const recs = matchLearningRecommendations({
        customCatalog: matchingTestCatalog(),
      targetPosition: "Information Security Analyst",
        degreeProgram: "BS Information Technology",
        skillGaps: [
          { skill: "Network Security", importance: "high" },
          { skill: "Incident Response", importance: "high" },
          { skill: "Threat Analysis", importance: "medium" },
        ],
        detectedSkills: ["Linux", "Python"],
      });

      expect(recs.length).toBeGreaterThan(0);
      const topRec = recs[0];
      expect(topRec.relevanceTier).toBe("TIER_1_DIRECT_GAP");
      expect(
        topRec.matchedCompetency?.toLowerCase().includes("security") ||
        topRec.matchedCompetency?.toLowerCase().includes("threat") ||
        topRec.matchedCompetency?.toLowerCase().includes("network")
      ).toBe(true);
    });

    test("Business / Accounting: prioritizes financial and audit skills", () => {
      const recs = matchLearningRecommendations({
        targetPosition: "Certified Public Accountant",
        degreeProgram: "BS Accountancy",
        collegeDomain: "Business and Accountancy",
        skillGaps: [
          { skill: "Financial Accounting", importance: "high" },
          { skill: "Auditing and Internal Controls", importance: "high" },
        ],
        detectedSkills: ["Excel"],
      });

      expect(recs.length).toBeGreaterThan(0);
      const topRec = recs[0];
      expect(topRec.relevanceTier).toBe("TIER_1_DIRECT_GAP");
    });
  });
});
