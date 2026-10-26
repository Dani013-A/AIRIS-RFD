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

import { getInstantCatalog, matchLearningRecommendations, normalizeGap, evaluateGapMatch } from "./learningCatalogService";

describe("Scratch Inspection: Full Stack Developer Resources", () => {
  test("inspect 6 resources against 5 compound gaps", () => {
    const catalog = getInstantCatalog();
    const compoundGaps = [
      "Node.js with Express.js for server-side development",
      "RESTful API design and GraphQL implementation",
      "SQL (PostgreSQL/MySQL) and NoSQL (MongoDB) database management",
      "Docker containerization and Kubernetes orchestration",
      "CI/CD pipeline setup using Jenkins, GitHub Actions, or GitLab CI",
    ];

    const targetRole = "Full Stack Developer";
    const normalizedGaps = compoundGaps.map(g => normalizeGap(g));

    const targetResourceIds = [
      "cert_meta_backend_dev",             // Meta Back-End Developer
      "cert_gcp_associate_cloud_engineer", // Google Cloud Associate Cloud Engineer
      "course_harvard_cs50x",              // Harvard CS50
      "course_princeton_algorithms_part1", // Algorithms, Part I
      "video_fcc_docker_containers",       // Docker Tutorial for Beginners
      "video_fcc_git_github",              // Git and GitHub for Beginners
      "course_full_stack_open",            // Full Stack Open (Complete coverage of REST + GraphQL)
    ];

    console.log("\n=== CURRENT MATCHING RESULTS FOR TARGET RESOURCES ===");
    for (const id of targetResourceIds) {
      const res = catalog.resources.find(r => r.id === id);
      if (!res) {
        console.log(`Resource NOT FOUND: ${id}`);
        continue;
      }

      console.log(`\n--------------------------------------------------`);
      console.log(`RESOURCE: ${res.title} (${res.id})`);
      console.log(`SKILLS: ${JSON.stringify(res.skills)}`);
      
      for (const gap of normalizedGaps) {
        const evalResult = evaluateGapMatch(gap, res, null);
        if (evalResult.isMatch) {
          console.log(`  MATCHED GAP: "${gap.raw}"`);
          console.log(`  isDirectGap: ${evalResult.isDirectGap}`);
          console.log(`  matchedConcept: ${evalResult.matchedConcept}`);
          console.log(`  matchedComponents: ${JSON.stringify(evalResult.matchedComponents)}`);
          console.log(`  unmatchedComponents: ${JSON.stringify(evalResult.unmatchedComponents)}`);
          console.log(`  coverageRatio: ${evalResult.coverageRatio}`);
          console.log(`  matchScore: ${evalResult.matchScore}`);
        }
      }
    }

    console.log("\n=== FULL RECOMMENDATION RUN FOR FULL STACK DEVELOPER ===");
    const recs = matchLearningRecommendations({
      targetPosition: targetRole,
      degreeProgram: "Bachelor of Science in Computer Science",
      department: "Computer Science",
      collegeDomain: "College of Computer Studies",
      skillGaps: compoundGaps.map(g => ({ skill: g, importance: "high" })),
      detectedSkills: ["HTML", "CSS", "JavaScript"],
    });

    for (const id of targetResourceIds) {
      const match = recs.find(r => r.id === id);
      console.log(`\n--------------------------------------------------`);
      console.log(`RESOURCE: ${id}`);
      if (match) {
        console.log(`  Title: ${match.title}`);
        console.log(`  Tier: ${match.relevanceTier}`);
        console.log(`  Matched Gap: ${match.matchedSkillGap}`);
        console.log(`  Matched Competency: ${match.matchedCompetency}`);
        console.log(`  Recommendation Reason / Rationale:`);
        console.log(`  "${match.recommendationReason}"`);
      } else {
        console.log(`  NOT RECOMMENDED in final output`);
      }
    }
  });

  test("reviewed React resource cannot claim REST and GraphQL coverage", () => {
    const res = getInstantCatalog().resources.find(r => r.id === "doc_react_quick_start");
    expect(res).toBeDefined();
    const result = evaluateGapMatch(normalizeGap("RESTful API design and GraphQL implementation"), res!, null);
    expect(result.isDirectGap).toBe(false);
  });
});
