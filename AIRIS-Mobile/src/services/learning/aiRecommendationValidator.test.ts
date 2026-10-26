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
  validateAiRecommendationCandidate,
  filterAndVerifyAiCandidates,
} from "./aiRecommendationValidator";
import { VERIFIED_LEARNING_CATALOG } from "../../data/verifiedLearningCatalog";
import { LearningResource } from "../../types/learning.types";

describe("13-Stage AI Recommendation Validation Pipeline", () => {
  const dummyCatalog: LearningResource[] = [
    {
      id: "curated_ccna",
      title: "Cisco Certified Network Associate (CCNA 200-301)",
      description: "Industry standard networking certification from Cisco validating routing and switching.",
      provider: "Cisco",
      type: "certification",
      category: "for_you",
      careerPaths: ["network administrator"],
      skills: ["networking", "cisco ios"],
      url: "https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html",
      isVerified: true,
      isActive: true,
      source: "curated",
      verificationStatus: "verified",
      priority: 95,
      tags: ["cisco", "ccna"],
    },
  ];

  const baseContext = {
    targetGaps: ["Network Administration", "Linux Administration"],
    targetPosition: "Information Technology Specialist",
    existingCatalog: dummyCatalog,
    rawResumeText: "Student with Python and React skills from TIP.",
  };

  it("Stage 1: Rejects candidate with missing or invalid URL syntax", () => {
    const res = validateAiRecommendationCandidate(
      {
        title: "Introduction to Network Administration",
        provider: "Coursera",
        type: "course",
        url: "not-a-valid-url",
        description: "Comprehensive introduction to network devices, protocols, and routing configuration.",
        skills: ["network administration"],
      },
      baseContext
    );
    expect(res.isValid).toBe(false);
    expect(res.stageResults[0].passed).toBe(false);
  });

  it("Stage 2: Rejects candidate with search engine query fallback or placeholder domain", () => {
    const res = validateAiRecommendationCandidate(
      {
        title: "Introduction to Network Administration",
        provider: "Google",
        type: "course",
        url: "https://www.google.com/search?q=network+administration+course",
        description: "Comprehensive introduction to network devices, protocols, and routing configuration.",
        skills: ["network administration"],
      },
      baseContext
    );
    expect(res.isValid).toBe(false);
    expect(res.stageResults.find((s) => s.stageNumber === 2)?.passed).toBe(false);
  });

  it("Stage 3: Rejects candidate with untrusted / non-authoritative domain", () => {
    const res = validateAiRecommendationCandidate(
      {
        title: "Free Network Admin Guide 2026",
        provider: "SpammyTutorials",
        type: "guide",
        url: "https://www.spammytutorials-freepdf.xyz/guide/network-admin",
        description: "Comprehensive introduction to network devices, protocols, and routing configuration.",
        skills: ["network administration"],
      },
      baseContext
    );
    expect(res.isValid).toBe(false);
    expect(res.stageResults.find((s) => s.stageNumber === 3)?.passed).toBe(false);
  });

  it("Stage 4: Rejects generic provider root homepage without specific course/cert path", () => {
    const res = validateAiRecommendationCandidate(
      {
        title: "Coursera Learning Platform Homepage",
        provider: "Coursera",
        type: "course",
        url: "https://www.coursera.org/",
        description: "Explore thousands of courses in computer science and information technology.",
        skills: ["network administration"],
      },
      baseContext
    );
    expect(res.isValid).toBe(false);
    expect(res.stageResults.find((s) => s.stageNumber === 4)?.passed).toBe(false);
  });

  it("Stage 6 & 7: Rejects candidate with truncated title or superficial description", () => {
    const resShortTitle = validateAiRecommendationCandidate(
      {
        title: "Net Course",
        provider: "Coursera",
        type: "course",
        url: "https://www.coursera.org/learn/networking",
        description: "Comprehensive introduction to network devices, protocols, and routing configuration.",
        skills: ["network administration"],
      },
      baseContext
    );
    expect(resShortTitle.isValid).toBe(false);

    const resShortDesc = validateAiRecommendationCandidate(
      {
        title: "Computer Networking Fundamentals Course",
        provider: "Coursera",
        type: "course",
        url: "https://www.coursera.org/learn/networking",
        description: "Too short.",
        skills: ["network administration"],
      },
      baseContext
    );
    expect(resShortDesc.isValid).toBe(false);
  });

  it("Stage 10: Rejects candidate that does not address validated target gaps or target role", () => {
    const res = validateAiRecommendationCandidate(
      {
        title: "Introduction to Organic Chemistry and Molecular Biology",
        provider: "edX",
        type: "course",
        url: "https://www.edx.org/learn/chemistry/intro-organic-chemistry",
        description: "Explore fundamental organic chemical reactions, structures, and synthesis pathways.",
        skills: ["organic chemistry", "biology"],
      },
      baseContext
    );
    expect(res.isValid).toBe(false);
    expect(res.stageResults.find((s) => s.stageNumber === 10)?.passed).toBe(false);
  });

  it("Stage 11: Rejects candidate that duplicates existing curated catalog resource", () => {
    const res = validateAiRecommendationCandidate(
      {
        title: "Cisco Certified Network Associate (CCNA 200-301)",
        provider: "Cisco",
        type: "certification",
        url: "https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html",
        description: "Official Cisco certification validating IP connectivity and network configuration.",
        skills: ["network administration"],
      },
      baseContext
    );
    expect(res.isValid).toBe(false);
    expect(res.stageResults.find((s) => s.stageNumber === 11)?.passed).toBe(false);
  });

  it("Stage 12: Rejects candidate with credential already possessed on resume", () => {
    const contextWithCert = {
      ...baseContext,
      rawResumeText: "Certified in Cisco CCNA 200-301 and CompTIA Security+.",
    };
    const res = validateAiRecommendationCandidate(
      {
        title: "CompTIA Security+ Exam Preparation",
        provider: "CompTIA",
        type: "certification",
        url: "https://www.comptia.org/certifications/security",
        credentialCode: "SY0-701",
        aliases: ["CompTIA Security+", "Security+"],
        description: "Prepare for the industry standard cybersecurity credential with hands-on labs.",
        skills: ["network administration"],
      },
      contextWithCert
    );
    expect(res.isValid).toBe(false);
    expect(res.stageResults.find((s) => s.stageNumber === 12)?.passed).toBe(false);
  });

  it("Stage 13 rejects unreviewed URLs despite plausible provider and HTTP metadata", () => {
    const result = validateAiRecommendationCandidate({ title: "Hands-on Linux System Administration Bootcamp", provider: "edX", type: "course", url: "https://www.edx.org/learn/linux/hands-on-sysadmin-bootcamp", description: "Practical course mastering user accounts, systemd services, shell scripting and storage configuration.", skills: ["linux administration"], isVerified: true }, baseContext);
    expect(result.isValid).toBe(false);
  });

  it("Batch validation resolves selected URLs to reviewed facts and rejects invented metadata", () => {
    const resource = VERIFIED_LEARNING_CATALOG.find(r => r.id === "doc_figma_auto_layout")!;
    expect(resource).toBeDefined();
    const verified = filterAndVerifyAiCandidates([
      { ...resource, title: "Invented title", provider: "Invented provider", skills: ["invented competency"] },
      { title: "Bad resource", url: "invalid" },
    ], { ...baseContext, targetPosition: "UI/UX Designer", targetGaps: ["auto layout"], existingCatalog: [] });
    expect(verified).toHaveLength(1);
    expect(verified[0].title).toBe(resource.title);
    expect(verified[0].skills).toEqual(resource.skills);
    expect(verified[0].source).toBe("curated");
    expect(verified[0].verification?.contentReviewed).toBe(true);
  });

  it("Growth Path Quota: enforces up to 3 curated + up to 3 AI-verified items per category", () => {
    const { getGrowthPathRecommendations } = require("./learningCatalogService");

    const aiCandidates = [
      {
        id: "ai_cert_1",
        title: "CompTIA SecurityX Advanced Practitioner",
        provider: "CompTIA",
        type: "certification" as const,
        url: "https://www.comptia.org/certifications/securityx",
        description: "Advanced cybersecurity credential focusing on enterprise security architecture, risk management, and security operations.",
        skills: ["network administration", "security"],
      },
      {
        id: "ai_course_1",
        title: "Hands-on Linux System Administration Bootcamp",
        provider: "edX",
        type: "course" as const,
        url: "https://www.edx.org/learn/linux/hands-on-sysadmin-bootcamp",
        description: "Practical course mastering user accounts, systemd services, shell scripting, and storage configuration on Linux.",
        skills: ["linux administration"],
      },
    ];

    const result = getGrowthPathRecommendations({
      targetPosition: "Information Technology Specialist",
      degreeProgram: "BS Information Technology",
      aiCandidates,
    });

    // Curated items are present and have source="curated" and verificationStatus="verified"
    expect(result.certifications.length).toBeGreaterThan(0);
    expect(result.certifications.length).toBeLessThanOrEqual(6);
    expect(result.courses.length).toBeGreaterThan(0);
    expect(result.courses.length).toBeLessThanOrEqual(6);

    const curatedCerts = result.certifications.filter((c: any) => c.source === "curated");
    const aiCerts = result.certifications.filter((c: any) => c.source === "ai_generated");
    expect(curatedCerts.length).toBeLessThanOrEqual(3);
    expect(aiCerts.length).toBeLessThanOrEqual(3);

    // AI items are verified
    if (aiCerts.length > 0) {
      expect(aiCerts[0].verificationStatus).toBe("verified");
    }
  });
});
