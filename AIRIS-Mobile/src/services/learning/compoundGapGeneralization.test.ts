import { withReviewedFixtureMetadata } from "./reviewedTestFixtures";
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
  decomposeCompoundGap,
  normalizeGap,
  evaluateGapMatch,
  matchLearningRecommendations,
  getInstantCatalog,
} from "./learningCatalogService";
import { LearningResource } from "../../types/learning.types";

function createMockResource(
  id: string,
  title: string,
  skills: string[],
  careerPaths: string[] = ["software engineer", "full stack developer"],
  type: any = "course"
): LearningResource {
  return {
    id,
    title,
    description: `Comprehensive training in ${skills.join(", ")}.`,
    provider: "AIRIS Test Academy",
    type,
    category: "for_you",
    careerPaths,
    skills,
    url: `https://www.coursera.org/learn/synthetic-${id}`,
    isVerified: true,
    isActive: true,
    priority: 90,
    tags: [...skills],
  };
}

describe("AIRIS — Final Learning Gap Generalization Test Suite (All 10 Required Scenarios)", () => {
  // Test 1: Single-component gap
  test("1. Single-component gap -> resource matching that component is direct/appropriate", () => {
    const gap = normalizeGap("Data Visualization");
    expect(gap.atomicComponents?.length).toBe(1);

    const res = createMockResource("res_tableau", "Tableau Masterclass", ["data visualization", "tableau"], ["data analyst"]);
    const evalResult = evaluateGapMatch(gap, res, null);

    expect(evalResult.isMatch).toBe(true);
    expect(evalResult.isDirectGap).toBe(true);
    expect(evalResult.isPartialGap).toBe(false);
    expect(evalResult.matchedComponents).toContain("Data Visualization");
    expect(evalResult.groundedRationale).toContain("Develops competencies not clearly demonstrated in your current resume:");
  });

  // Test 2: Two-component gap (1 component matched = partial, not full)
  test("2. Two-component gap -> resource matching one component is partial, not full", () => {
    const gap = normalizeGap("Docker containerization and Kubernetes orchestration");
    const resDocker = createMockResource("res_docker", "Docker for Beginners", ["docker", "containers"]);

    const evalResult = evaluateGapMatch(gap, resDocker, null);

    expect(evalResult.isMatch).toBe(true);
    expect(evalResult.isDirectGap).toBe(false);
    expect(evalResult.isPartialGap).toBe(true);
    expect(evalResult.matchedComponents).toContain("Docker");
    expect(evalResult.unmatchedComponents).toContain("Kubernetes");
    expect(evalResult.groundedRationale).toContain("Builds practical");
    expect(evalResult.groundedRationale).not.toContain("Kubernetes");
  });

  // Test 3: Two-component gap (both components matched = direct)
  test("3. Two-component gap -> resource matching both components can be direct", () => {
    const gap = normalizeGap("RESTful API design and GraphQL implementation");
    const resBoth = createMockResource("res_api_full", "Modern APIs: REST & GraphQL", ["rest api", "graphql"]);

    const evalResult = evaluateGapMatch(gap, resBoth, null);

    expect(evalResult.isMatch).toBe(true);
    expect(evalResult.isDirectGap).toBe(true);
    expect(evalResult.isPartialGap).toBe(false);
    expect(evalResult.matchedComponents).toContain("REST API");
    expect(evalResult.matchedComponents).toContain("GraphQL");
    expect(evalResult.groundedRationale).toContain("Develops competencies not clearly demonstrated in your current resume:");
  });

  // Test 4: Five-component gap (coverage calculated per component)
  test("4. Five-component gap -> coverage is calculated per component", () => {
    const gap = normalizeGap("SQL (PostgreSQL/MySQL) and NoSQL (MongoDB) database management");
    expect(gap.atomicComponents?.map(c => c.canonical)).toEqual(
      expect.arrayContaining(["PostgreSQL", "MySQL", "MongoDB", "SQL", "NoSQL", "database management"])
    );

    const resMySQL = createMockResource("res_mysql", "MySQL Mastery", ["mysql", "databases"]);
    const evalResult = evaluateGapMatch(gap, resMySQL, null);

    expect(evalResult.isMatch).toBe(true);
    expect(evalResult.isDirectGap).toBe(false);
    expect(evalResult.isPartialGap).toBe(true);
    expect(evalResult.matchedComponents).toContain("MySQL");
    expect(evalResult.matchedComponents).toContain("SQL");
    expect(evalResult.matchedComponents).toContain("database management");
    expect(evalResult.unmatchedComponents).toContain("PostgreSQL");
    expect(evalResult.unmatchedComponents).toContain("NoSQL");
    expect(evalResult.unmatchedComponents).toContain("MongoDB");
    expect(evalResult.coverageRatio).toBe(3 / 6);
  });

  // Test 5: Synonym and Parent-Concept Matching
  test("5. Synonym matching: PostgreSQL -> SQL, MongoDB -> NoSQL, Docker -> containerization, Jenkins -> CI/CD", () => {
    const gapSQL = normalizeGap("SQL");
    const gapNoSQL = normalizeGap("NoSQL");
    const gapContainer = normalizeGap("containerization");
    const gapCICD = normalizeGap("CI/CD");

    const resPostgres = createMockResource("res_pg", "Postgres Course", ["postgresql"]);
    const resMongo = createMockResource("res_mongo", "Mongo Course", ["mongodb"]);
    const resDocker = createMockResource("res_dock", "Docker Course", ["docker"]);
    const resJenkins = createMockResource("res_jenk", "Jenkins Course", ["jenkins"]);

    expect(evaluateGapMatch(gapSQL, resPostgres, null).isDirectGap).toBe(true);
    expect(evaluateGapMatch(gapNoSQL, resMongo, null).isDirectGap).toBe(true);
    expect(evaluateGapMatch(gapContainer, resDocker, null).isDirectGap).toBe(true);
    expect(evaluateGapMatch(gapCICD, resJenkins, null).isDirectGap).toBe(true);
  });

  // Test 6: Negative Semantic Boundaries Enforcement
  test("6. Negative semantic inference: Git != CI/CD, Docker != K8s, MySQL != MongoDB, REST != GraphQL", () => {
    const gapCICD = normalizeGap("CI/CD");
    const gapK8s = normalizeGap("Kubernetes");
    const gapMongo = normalizeGap("MongoDB");
    const gapGraphQL = normalizeGap("GraphQL");

    const resGit = createMockResource("res_git", "Git Essentials", ["git", "github"]);
    const resDocker = createMockResource("res_dock", "Docker Essentials", ["docker"]);
    const resMySQL = createMockResource("res_mysql", "MySQL Course", ["mysql", "sql"]);
    const resREST = createMockResource("res_rest", "REST API Guide", ["rest api"]);

    expect(evaluateGapMatch(gapCICD, resGit, null).isMatch).toBe(false);
    expect(evaluateGapMatch(gapK8s, resDocker, null).isMatch).toBe(false);
    expect(evaluateGapMatch(gapMongo, resMySQL, null).isMatch).toBe(false);
    expect(evaluateGapMatch(gapGraphQL, resREST, null).isMatch).toBe(false);
  });

  // Test 7: Rationale Accuracy (Derivation Strictly from Matched Evidence)
  test("7. Rationale accuracy: every displayed competency claim is supported by matched evidence", () => {
    const gap = normalizeGap("Docker containerization and Kubernetes orchestration");
    const resDocker = createMockResource("res_docker", "Docker Essentials", ["docker", "containers"]);

    const evalResult = evaluateGapMatch(gap, resDocker, null);
    expect(evalResult.groundedRationale).toContain("Docker");
    expect(evalResult.groundedRationale).toContain("containerization");
    expect(evalResult.groundedRationale).not.toContain("Kubernetes");
    expect(evalResult.groundedRationale).not.toContain("orchestration");
  });

  // Test 8: Mandatory Full Stack Developer Screenshot Scenario
  test("8. Controlled full-stack fixtures preserve partial coverage without borrowing claims", () => {
    const customCatalog = withReviewedFixtureMetadata([
      createMockResource("cert_meta_backend_dev", "Synthetic backend fixture", ["mysql", "rest api"]),
      createMockResource("course_harvard_cs50x", "Synthetic SQL fixture", ["sql"]),
      createMockResource("course_princeton_algorithms_part1", "Synthetic algorithms fixture", ["algorithms"]),
      createMockResource("video_fcc_docker_containers", "Synthetic Docker fixture", ["docker"]),
      createMockResource("video_fcc_git_github", "Synthetic Git fixture", ["git"]),
    ]);
    const compoundGaps = [
      "Node.js with Express.js for server-side development",
      "RESTful API design and GraphQL implementation",
      "SQL (PostgreSQL/MySQL) and NoSQL (MongoDB) database management",
      "Docker containerization and Kubernetes orchestration",
      "CI/CD pipeline setup using Jenkins, GitHub Actions, or GitLab CI",
    ];

    const recs = matchLearningRecommendations({
      customCatalog,
      targetPosition: "Full Stack Developer",
      degreeProgram: "Bachelor of Science in Computer Science",
      department: "Computer Science",
      collegeDomain: "College of Computer Studies",
      skillGaps: compoundGaps.map(g => ({ skill: g, importance: "high" })),
      detectedSkills: ["HTML", "CSS", "JavaScript"],
    });

    const metaBackend = recs.find(r => r.id === "cert_meta_backend_dev");
    const gcpACE = recs.find(r => r.id === "cert_gcp_associate_cloud_engineer");
    const cs50 = recs.find(r => r.id === "course_harvard_cs50x");
    const algorithms = recs.find(r => r.id === "course_princeton_algorithms_part1");
    const dockerFCC = recs.find(r => r.id === "video_fcc_docker_containers");
    const gitFCC = recs.find(r => r.id === "video_fcc_git_github");

    // 1. Meta Back-End: has MySQL and REST API, but NOT MongoDB or GraphQL
    expect(metaBackend).toBeDefined();
    expect(metaBackend?.relevanceTier).not.toBe("TIER_1_DIRECT_GAP");
    expect(metaBackend?.recommendationReason).not.toContain("MongoDB");
    expect(metaBackend?.recommendationReason).not.toContain("GraphQL");

    // 2. The audited Google Cloud ACE URL is retired and must not be recommended.
    expect(gcpACE).toBeUndefined();

    // 3. Harvard CS50: has SQL, but NOT MongoDB or PostgreSQL
    expect(cs50).toBeDefined();
    expect(cs50?.relevanceTier).not.toBe("TIER_1_DIRECT_GAP");
    expect(cs50?.recommendationReason).not.toContain("MongoDB");
    expect(cs50?.recommendationReason).not.toContain("PostgreSQL");

    // 4. Algorithms, Part I: no gap match, recommended as core role competency
    expect(algorithms).toBeDefined();
    expect(algorithms?.relevanceTier).toBe("TIER_2_ROLE_COMPETENCY");
    expect(algorithms?.matchedSkillGap).toBe("NONE");

    // 5. Docker Tutorial: has Docker, but NOT Kubernetes
    expect(dockerFCC).toBeDefined();
    expect(dockerFCC?.relevanceTier).not.toBe("TIER_1_DIRECT_GAP");
    expect(dockerFCC?.recommendationReason).not.toContain("Kubernetes");

    // 6. Git and GitHub: Git != CI/CD, NOT described as teaching Jenkins/GitHub Actions/GitLab CI
    expect(gitFCC).toBeDefined();
    expect(gitFCC?.relevanceTier).not.toBe("TIER_1_DIRECT_GAP");
    expect(gitFCC?.matchedSkillGap).toBe("NONE");
    expect(gitFCC?.recommendationReason).not.toContain("CI/CD");
    expect(gitFCC?.recommendationReason).not.toContain("Jenkins");
  });

  // Test 9: Cross-domain Compound Gaps (5 Unrelated Disciplines)
  test("9. Cross-domain compound gaps across 5 unrelated disciplines", () => {
    // Discipline 1: Civil / Structural Engineering
    const engGap = normalizeGap("Structural Analysis with STAAD.Pro and Concrete Design");
    const engRes = createMockResource("res_staad", "STAAD.Pro Fundamentals", ["staad.pro"], ["civil engineer"]);
    const engCov = evaluateGapMatch(engGap, engRes, null);
    expect(engCov.matchedComponents).toContain("STAAD.Pro");
    expect(engCov.matchedComponents).toContain("structural analysis");
    expect(engCov.unmatchedComponents).toContain("Concrete Design");
    expect(engCov.isPartialGap).toBe(true);

    // Discipline 2: Mechanical CAD
    const cadGap = normalizeGap("CAD modeling using SolidWorks");
    const cadRes = createMockResource("res_sw", "SolidWorks 3D CAD", ["solidworks"], ["mechanical engineer"]);
    const cadCov = evaluateGapMatch(cadGap, cadRes, null);
    expect(cadCov.matchedComponents).toContain("SolidWorks");
    expect(cadCov.matchedComponents).toContain("CAD");
    expect(cadCov.isDirectGap).toBe(true);

    // Discipline 3: Finance / Accounting
    const finGap = normalizeGap("Financial Reporting under IFRS and US GAAP");
    const finRes = createMockResource("res_ifrs", "IFRS Practical Standards", ["ifrs"], ["accountant"]);
    const finCov = evaluateGapMatch(finGap, finRes, null);
    expect(finCov.matchedComponents).toContain("IFRS");
    expect(finCov.unmatchedComponents).toContain("US GAAP");
    expect(finCov.isPartialGap).toBe(true);
    expect(finCov.groundedRationale).not.toContain("US GAAP");

    // Discipline 4: Internal Audit
    const auditGap = normalizeGap("Internal Controls and Risk Assessment using COSO");
    const auditRes = createMockResource("res_coso", "COSO Internal Controls", ["coso"], ["auditor"]);
    const auditCov = evaluateGapMatch(auditGap, auditRes, null);
    expect(auditCov.matchedComponents).toContain("COSO");
    expect(auditCov.matchedComponents).toContain("Internal Controls");
    expect(auditCov.unmatchedComponents).toContain("Risk Assessment");
    expect(auditCov.isPartialGap).toBe(true);

    // Discipline 5: Creative Writing & SEO
    const seoGap = normalizeGap("Content Writing and SEO optimization");
    const seoRes = createMockResource("res_seo", "SEO Marketing Guide", ["seo"], ["content writer"]);
    const seoCov = evaluateGapMatch(seoGap, seoRes, null);
    expect(seoCov.matchedComponents).toContain("SEO");
    expect(seoCov.unmatchedComponents).toContain("Content Writing");
    expect(seoCov.isPartialGap).toBe(true);
    expect(seoCov.groundedRationale).not.toContain("Content Writing");
  });

  // Test 10: Sparse Catalog Behavior
  test("10. Sparse catalog: partial resources remain partial and system never fabricates direct coverage", () => {
    // Only a Docker resource exists, candidate has a compound gap for Docker + Kubernetes
    const sparseCatalog = [
      createMockResource("video_fcc_docker", "Docker Beginner Course", ["docker", "containers"], ["software engineer"], "video"),
    ];

    const recs = matchLearningRecommendations({
      targetPosition: "Software Engineer",
      customCatalog: withReviewedFixtureMetadata(sparseCatalog),
      skillGaps: [{ skill: "Docker containerization and Kubernetes orchestration", importance: "high" }],
    });

    expect(recs.length).toBe(1);
    const item = recs[0];
    expect(item.relevanceTier).toBe("TIER_2_ROLE_COMPETENCY");
    expect(item.isPersonalizedGap).toBeFalsy();
    expect(item.recommendationReason).toContain("Docker");
    expect(item.recommendationReason).not.toContain("Kubernetes");
    expect(item.recommendationReason).not.toContain("Develops competencies not clearly demonstrated in your current resume: in \"Docker containerization and Kubernetes orchestration\"");
  });
});
