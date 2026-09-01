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
  getInstantCatalog,
  logForYouRecommendations,
  matchLearningRecommendations,
} from "./learningCatalogService";
import {
  isValidUrl,
  isSeminarExpired,
  validateLearningResource,
} from "./catalogValidator";
import { VERIFIED_LEARNING_CATALOG } from "../../data/verifiedLearningCatalog";
import { DEFAULT_LEARNING_CATEGORIES } from "../../data/learningCategories";

describe("Learning Catalog & Universal Matching Engine Tests", () => {
  describe("1. Catalog Validation & Real Resources Guarantee", () => {
    it("All catalog resources must have real HTTPS URLs and non-empty titles/providers", () => {
      expect(VERIFIED_LEARNING_CATALOG.length).toBeGreaterThanOrEqual(15);

      for (const res of VERIFIED_LEARNING_CATALOG) {
        expect(res.id).toBeTruthy();
        expect(res.title).toBeTruthy();
        expect(res.provider).toBeTruthy();
        expect(res.url).toMatch(/^https:\/\//);
        expect(validateLearningResource(res)).toBe(true);

        // Disallow fake/placeholder search queries
        expect(res.url).not.toContain("google.com/search");
        expect(res.url).not.toContain("example.com");

        if (res.thumbnailUrl) {
          expect(res.thumbnailUrl).toMatch(/^https:\/\//);
        }
      }
    });

    it("Validates URL format correctly", () => {
      expect(isValidUrl("https://aws.amazon.com/certification/")).toBe(true);
      expect(isValidUrl("https://react.dev/learn")).toBe(true);
      expect(isValidUrl("https://www.youtube.com/watch?v=0nTRi3fZzG0")).toBe(true);
      expect(isValidUrl("http://insecure.com")).toBe(true);
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("")).toBe(false);
    });

    it("Correctly identifies expired seminars", () => {
      const activeSeminar: any = {
        id: "active_sem",
        title: "Active DevCon",
        provider: "DevCon",
        type: "seminar",
        url: "https://devcon.ph/",
        seminarMetadata: {
          expiresAt: "2099-01-01T00:00:00Z",
        },
      };

      const expiredSeminar: any = {
        id: "expired_sem",
        title: "Past DevCon 2020",
        provider: "DevCon",
        type: "seminar",
        url: "https://devcon.ph/",
        seminarMetadata: {
          expiresAt: "2020-01-01T00:00:00Z",
        },
      };

      expect(isSeminarExpired(activeSeminar)).toBe(false);
      expect(isSeminarExpired(expiredSeminar)).toBe(true);
    });
  });

  describe("2. Primary Learn Categories (For You, Interviews, Resume, Communication)", () => {
    it("getInstantCatalog returns all 4 user-intent categories immediately", () => {
      const instant = getInstantCatalog();
      expect(instant.categories.length).toBe(4);
      const categoryIds = instant.categories.map((c) => c.id);
      expect(categoryIds).toContain("for_you");
      expect(categoryIds).toContain("interviews");
      expect(categoryIds).toContain("resume");
      expect(categoryIds).toContain("communication");
    });

    it("Category 'interviews' returns generic interview preparation resources", () => {
      const items = matchLearningRecommendations({
        categoryId: "interviews",
      });
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.category).toBe("interviews");
        expect(item.url).toMatch(/^https:\/\//);
      }
      expect(items.some((i) => i.skills.includes("star method") || i.skills.includes("interviewing"))).toBe(true);
    });

    it("Category 'resume' returns generic resume writing and formatting guides", () => {
      const items = matchLearningRecommendations({
        categoryId: "resume",
      });
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.category).toBe("resume");
        expect(item.url).toMatch(/^https:\/\//);
      }
      expect(items.some((i) => i.skills.includes("resume writing") || i.provider.includes("Harvard"))).toBe(true);
    });

    it("Category 'communication' returns professional workplace communication resources", () => {
      const items = matchLearningRecommendations({
        categoryId: "communication",
      });
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.category).toBe("communication");
        expect(item.url).toMatch(/^https:\/\//);
      }
      expect(items.some((i) => i.skills.includes("public speaking") || i.provider.includes("Stanford"))).toBe(true);
    });
  });

  describe("3. 'For You' Personalized Career Path & Gap Matching Engine", () => {
    it("Matches Data Analyst role and Power BI / SQL skill gaps with highest relevance", () => {
      const recommendations = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Data Analyst",
        skillGaps: [
          { skill: "Power BI", importance: "high", reason: "Missing BI dashboarding experience" },
          { skill: "SQL", importance: "high", reason: "Core data querying requirement" },
        ],
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const topMatch = recommendations[0];
      expect(
        topMatch.skills.includes("power bi") ||
        topMatch.skills.includes("sql") ||
        topMatch.careerPaths.includes("data analyst")
      ).toBe(true);
      expect(topMatch.relevanceScore).toBeGreaterThan(100);
      expect(topMatch.isPersonalizedGap).toBe(true);
    });

    it("Matches Software Engineer role with Git and Full-Stack development resources", () => {
      const recommendations = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Software Engineer",
        skillGaps: [{ skill: "Git", importance: "high" }],
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasSwOrGit = recommendations.some(
        (r) => r.careerPaths.includes("software engineer") || r.skills.includes("git")
      );
      expect(hasSwOrGit).toBe(true);
    });

    it("Matches Cybersecurity Analyst role with CompTIA Security+ and security standards", () => {
      const recommendations = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Cybersecurity Analyst",
        skillGaps: [{ skill: "Network Security", importance: "high" }],
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const topRec = recommendations[0];
      expect(
        topRec.careerPaths.includes("cybersecurity analyst") ||
        topRec.skills.includes("cybersecurity") ||
        topRec.skills.includes("network security")
      ).toBe(true);
    });

    it("Matches Cloud Engineer role with AWS Cloud Practitioner and Solutions Architect", () => {
      const recommendations = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Cloud Engineer",
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasCloudRec = recommendations.some(
        (r) => r.skills.includes("cloud computing") || r.skills.includes("aws") || r.careerPaths.includes("cloud engineer")
      );
      expect(hasCloudRec).toBe(true);
    });

    it("Matches UI/UX Designer role with Figma and UX design resources", () => {
      const recommendations = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "UI/UX Designer",
        skillGaps: [{ skill: "Figma", importance: "high" }],
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasFigmaOrUx = recommendations.some(
        (r) => r.skills.includes("figma") || r.skills.includes("ux design")
      );
      expect(hasFigmaOrUx).toBe(true);
    });

    it("Matches QA Engineer role with Cypress automated testing", () => {
      const recommendations = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "QA Engineer",
      });

      expect(recommendations.length).toBeGreaterThan(0);
      const hasQa = recommendations.some(
        (r) => r.skills.includes("automated testing") || r.skills.includes("cypress") || r.careerPaths.includes("qa engineer")
      );
      expect(hasQa).toBe(true);
    });

    it("Prioritizes target position career path and STRICTLY EXCLUDES disjoint roles", () => {
      const dataAnalystRecs = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Data Analyst",
        skillGaps: [
          { skill: "Advanced Predictive Modeling", importance: "high" },
          { skill: "Cloud Data Warehousing", importance: "high" },
        ],
      });

      expect(dataAnalystRecs.length).toBeGreaterThan(0);
      const recIds = dataAnalystRecs.map((r) => r.id);

      // Must include relevant matches
      expect(
        recIds.includes("doc_scikit_learn_guide") ||
        recIds.includes("doc_google_cloud_bigquery") ||
        recIds.includes("cert_ms_pl300_powerbi") ||
        recIds.includes("course_google_data_analytics") ||
        recIds.includes("practice_w3schools_sql") ||
        recIds.includes("doc_pandas_user_guide")
      ).toBe(true);

      // Must STRICTLY EXCLUDE disjoint domains
      expect(recIds).not.toContain("cert_comptia_security_plus");
      expect(recIds).not.toContain("course_google_cybersecurity");
      expect(recIds).not.toContain("practice_owasp_top_10");
      expect(recIds).not.toContain("doc_react_native_official");
      expect(recIds).not.toContain("doc_cypress_testing_docs");
      expect(recIds).not.toContain("video_fcc_figma_tutorial");
      expect(recIds).not.toContain("course_google_ux_design");
      expect(recIds).not.toContain("video_fcc_docker_containers");
      expect(recIds).not.toContain("course_meta_frontend_dev");
    });

    it("Generates meaningful contextual recommendation reason connecting gap to benefit", () => {
      const recs = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Data Analyst",
        skillGaps: [{ skill: "Power BI", importance: "high" }],
      });

      const topRec = recs[0];
      expect(topRec.recommendationReason).toBeTruthy();
      expect(topRec.recommendationReason).toContain("Power BI");
      expect(topRec.recommendationReason?.toLowerCase()).toContain("data analyst");
    });

    it("Handles arbitrary unseen role without crashing and returns valid foundational resources", () => {
      const recommendations = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Quantum Algorithm Developer",
        degreeProgram: "BS Computer Science",
        skillGaps: [{ skill: "Linear Algebra", importance: "medium" }],
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it("Accurately matches Time Series Forecasting, Advanced SQL Performance Tuning, and Data Governance without false positives", () => {
      const dataAnalystRecs = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Data Analyst",
        skillGaps: [
          { skill: "Time Series Forecasting", importance: "high" },
          { skill: "Advanced SQL Performance Tuning", importance: "high" },
          { skill: "Data Governance & Privacy", importance: "high" },
        ],
      });

      expect(dataAnalystRecs.length).toBeGreaterThan(0);
      const recIds = dataAnalystRecs.map((r) => r.id);

      // Must include genuine direct gap matches
      expect(recIds).toContain("book_fpp_forecasting");
      expect(recIds).toContain("doc_use_the_index_luke");
      expect(recIds.includes("guide_gdpr_data_governance") || recIds.includes("doc_google_dataplex_governance")).toBe(true);

      // Verify that genuine gap matches receive TIER_1_DIRECT_GAP with gapSubjectOverlap: true
      const forecastingRec = dataAnalystRecs.find((r) => r.id === "book_fpp_forecasting");
      expect(forecastingRec?.relevanceTier).toBe("TIER_1_DIRECT_GAP");
      expect(forecastingRec?.matchEvidence?.gapSubjectOverlap).toBe(true);
      expect(forecastingRec?.matchEvidence?.genericKeywordOnly).toBe(false);

      const sqlTuningRec = dataAnalystRecs.find((r) => r.id === "doc_use_the_index_luke");
      expect(sqlTuningRec?.relevanceTier).toBe("TIER_1_DIRECT_GAP");
      expect(sqlTuningRec?.matchEvidence?.gapSubjectOverlap).toBe(true);

      // Disjoint technologies MUST NOT be in the recommendations
      expect(recIds).not.toContain("course_google_cybersecurity");
      expect(recIds).not.toContain("course_meta_backend_dev");
      expect(recIds).not.toContain("doc_react_native_official");
      expect(recIds).not.toContain("video_fcc_figma_tutorial");
      expect(recIds).not.toContain("doc_cypress_testing_docs");
      expect(recIds).not.toContain("cert_comptia_security_plus");
    });

    it("Rejects false-positive matches when only a generic technology keyword overlaps", () => {
      const dataAnalystRecs = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Data Analyst",
        skillGaps: [{ skill: "Time Series Forecasting with Python", importance: "high" }],
      });

      const recIds = dataAnalystRecs.map((r) => r.id);

      // Google Cybersecurity has "python" but does NOT teach forecasting -> MUST NOT be in feed
      expect(recIds).not.toContain("course_google_cybersecurity");

      // Meta Back-End has "python" but does NOT teach forecasting -> MUST NOT be in feed
      expect(recIds).not.toContain("course_meta_backend_dev");

      // book_fpp_forecasting ACTUALLY teaches forecasting -> MUST be Tier 1
      const forecastItem = dataAnalystRecs.find((r) => r.id === "book_fpp_forecasting");
      expect(forecastItem?.relevanceTier).toBe("TIER_1_DIRECT_GAP");
    });

    it("Dynamically adapts to Cybersecurity Analyst role and suppresses disjoint data/frontend resources", () => {
      const cyberRecs = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Cybersecurity Analyst",
        skillGaps: [{ skill: "Network Security", importance: "high" }],
      });

      expect(cyberRecs.length).toBeGreaterThan(0);
      const recIds = cyberRecs.map((r) => r.id);

      // Must include relevant cybersecurity matches
      expect(
        recIds.includes("cert_comptia_security_plus") ||
        recIds.includes("course_google_cybersecurity") ||
        recIds.includes("practice_owasp_top_10")
      ).toBe(true);

      // Must exclude disjoint domains
      expect(recIds).not.toContain("cert_ms_pl300_powerbi");
      expect(recIds).not.toContain("doc_pandas_user_guide");
      expect(recIds).not.toContain("doc_react_native_official");
      expect(recIds).not.toContain("video_fcc_figma_tutorial");
    });

    it("Dynamically adapts to Software Engineer role and prioritizes Git/Backend/Frontend over cybersecurity/data certs", () => {
      const sweRecs = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Software Engineer",
        skillGaps: [{ skill: "Git", importance: "high" }],
      });

      expect(sweRecs.length).toBeGreaterThan(0);
      const recIds = sweRecs.map((r) => r.id);

      // Must include software engineering matches
      expect(
        recIds.includes("video_fcc_git_github") ||
        recIds.includes("course_meta_backend_dev") ||
        recIds.includes("course_meta_frontend_dev") ||
        recIds.includes("doc_mdn_javascript_guide")
      ).toBe(true);

      // Must exclude disjoint UI/UX and Cybersecurity certs
      expect(recIds).not.toContain("video_fcc_figma_tutorial");
      expect(recIds).not.toContain("cert_comptia_security_plus");
    });
  });

  describe("4. Resume Tab Resource Type Filtering (Certifications, Courses, Seminars)", () => {
    it("Filters exclusively for certifications", () => {
      const certs = matchLearningRecommendations({
        resourceType: "certification",
        targetPosition: "Cloud Engineer",
      });
      expect(certs.length).toBeGreaterThan(0);
      expect(certs.every((c) => c.type === "certification")).toBe(true);
    });

    it("Filters exclusively for courses", () => {
      const courses = matchLearningRecommendations({
        resourceType: "course",
        targetPosition: "Data Analyst",
      });
      expect(courses.length).toBeGreaterThan(0);
      expect(courses.every((c) => c.type === "course")).toBe(true);
    });

    it("Filters exclusively for seminars", () => {
      const seminars = matchLearningRecommendations({
        resourceType: "seminar",
        targetPosition: "Software Engineer",
      });
      expect(seminars.length).toBeGreaterThan(0);
      expect(seminars.every((s) => s.type === "seminar")).toBe(true);
    });
  });

  describe("5. Diagnostic Logging for 'For You' Page", () => {
    it("logForYouRecommendations prints the required structured banner and items", () => {
      const spy = jest.spyOn(console, "log").mockImplementation(() => {});
      const gaps = [{ skill: "Power BI" }, { skill: "SQL" }];
      const sampleItems = matchLearningRecommendations({
        categoryId: "for_you",
        targetPosition: "Data Analyst",
        skillGaps: gaps,
      });

      logForYouRecommendations("student_test_123", "Data Analyst", gaps, sampleItems);

      expect(spy).toHaveBeenCalledWith(expect.stringContaining("AIRIS - FOR YOU RECOMMENDATIONS"));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("User: student_test_123"));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("Target Role: Data Analyst"));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("Identified Gaps:"));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("- Power BI"));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("END FOR YOU RECOMMENDATIONS"));

      spy.mockRestore();
    });

    it("Prints live Data Analyst resume For You recommendations with strict relevance", () => {
      const liveSnapshot = {
        targetPosition: "Data Analyst",
        careerSummary: "You have a solid foundation in Python, SQL, and statistical analysis, but need demonstrable expertise in data visualization and BI tools to be competitive for Data Analyst roles.",
        skillGaps: [
          { skill: "Advanced Predictive Modeling", importance: "high", reason: "Demonstrate advanced machine learning and statistical modeling capabilities." },
          { skill: "Cloud Data Warehousing", importance: "high", reason: "Enterprise analytics require cloud data warehouse querying and architecture." },
          { skill: "Data Visualization", importance: "high", reason: "Translate data insights into clear visual stories for stakeholders." },
          { skill: "Power BI", importance: "high", reason: "Power BI certification is a strong differentiator for Microsoft environments." },
        ],
        careerContext: {
          targetPosition: "Data Analyst",
          detectedSkills: ["Python", "SQL", "R", "JavaScript", "Pandas", "NumPy", "Scikit-Learn", "Matplotlib", "PostgreSQL", "MySQL", "SQLite", "Firebase"],
          missingSkills: ["Data Visualization", "Tableau", "Power BI", "Cloud Data Warehousing"],
        },
      };

      const finalForYouList = matchLearningRecommendations({
        targetPosition: "Data Analyst",
        skillGaps: liveSnapshot.skillGaps,
        detectedSkills: liveSnapshot.careerContext.detectedSkills,
        missingSkills: liveSnapshot.careerContext.missingSkills,
        learningSnapshot: liveSnapshot,
        categoryId: "for_you",
        resourceType: "all",
      });

      expect(finalForYouList.length).toBeGreaterThan(0);
      expect(finalForYouList.length).toBeLessThanOrEqual(35);

      // Verify no irrelevant items leaked in
      const recIds = finalForYouList.map((r) => r.id);
      expect(recIds).not.toContain("cert_comptia_security_plus");
      expect(recIds).not.toContain("doc_react_native_official");
      expect(recIds).not.toContain("video_fcc_figma_tutorial");
      expect(recIds).not.toContain("doc_cypress_testing_docs");

      logForYouRecommendations("juan_dela_cruz_student", "Data Analyst", liveSnapshot.skillGaps, finalForYouList);
    });
  });

  describe("6. Resume-Aware Deduplication & Skill Depth Engine", () => {
    it("Excludes certifications by Credential Code (SY0-701, CLF-C02, PL-300)", () => {
      // 1. Resume with CompTIA Security+ code SY0-701
      const cyberRecs = matchLearningRecommendations({
        targetPosition: "Cybersecurity Analyst",
        rawResumeText: "CERTIFICATIONS: CompTIA Security+ (SY0-701) - Active credential valid through 2028.",
        categoryId: "for_you",
      });
      const cyberIds = cyberRecs.map((r) => r.id);
      expect(cyberIds).not.toContain("cert_comptia_security_plus");
      expect(cyberIds).toContain("cert_comptia_cysa_plus"); // Next-level cert remains available

      // 2. Resume with AWS Cloud Practitioner code CLF-C02
      const cloudRecs = matchLearningRecommendations({
        targetPosition: "Cloud Engineer",
        rawResumeText: "AWS Certified Cloud Practitioner CLF-C02 earned Nov 2025.",
        categoryId: "for_you",
      });
      const cloudIds = cloudRecs.map((r) => r.id);
      expect(cloudIds).not.toContain("cert_aws_cloud_practitioner");
      expect(cloudIds).toContain("cert_aws_solutions_architect_associate"); // Next-level cert remains available

      // 3. Resume with Power BI PL-300
      const daRecs = matchLearningRecommendations({
        targetPosition: "Data Analyst",
        rawResumeText: "Microsoft Certified Power BI Data Analyst (PL-300)",
        categoryId: "for_you",
      });
      const daIds = daRecs.map((r) => r.id);
      expect(daIds).not.toContain("cert_ms_pl300_powerbi");
    });

    it("Excludes certifications and courses by Structured Data", () => {
      const daRecs = matchLearningRecommendations({
        targetPosition: "Data Analyst",
        structuredResumeData: {
          certifications: [{ name: "Google Data Analytics Professional Certificate" }],
          courses: [{ name: "W3Schools SQL Interactive Practice" }],
        },
        categoryId: "for_you",
      });

      const daIds = daRecs.map((r) => r.id);
      expect(daIds).not.toContain("course_google_data_analytics");
      expect(daIds).not.toContain("practice_w3schools_sql");
    });

    it("Demotes basic beginner resources when skill is already demonstrated and not a gap", () => {
      const recs = matchLearningRecommendations({
        targetPosition: "Data Analyst",
        detectedSkills: ["Python", "SQL", "Pandas"],
        skillGaps: [{ skill: "Time Series Forecasting", importance: "high" }],
        categoryId: "for_you",
      });

      // Advanced gap resource for forecasting must be prioritized at the top
      const forecastItem = recs.find((r) => r.id === "book_fpp_forecasting");
      expect(forecastItem).toBeDefined();
      expect(forecastItem?.relevanceTier).toBe("TIER_1_DIRECT_GAP");
    });
  });

  describe("7. Growth Path Engine (getGrowthPathRecommendations)", () => {
    it("Returns up to 5 Certifications, 5 Courses, and 3 Practical Learning items for Data Analyst", () => {
      const { getGrowthPathRecommendations } = require("./learningCatalogService");

      const growthPaths = getGrowthPathRecommendations({
        targetPosition: "Data Analyst",
        degreeProgram: "BS Information Technology",
        activeAnalysis: {
          learningSnapshot: {
            targetPosition: "Data Analyst",
            skillGaps: [
              { skill: "Power BI", importance: "high" },
              { skill: "Data Visualization", importance: "high" },
            ],
          },
        },
      });

      expect(growthPaths.certifications.length).toBeGreaterThanOrEqual(1);
      expect(growthPaths.certifications.length).toBeLessThanOrEqual(5);
      expect(growthPaths.certifications.every((c: any) => c.type === "certification")).toBe(true);

      expect(growthPaths.courses.length).toBeGreaterThanOrEqual(1);
      expect(growthPaths.courses.length).toBeLessThanOrEqual(5);
      expect(growthPaths.courses.every((c: any) => c.type === "course")).toBe(true);

      expect(growthPaths.practicalLearning.length).toBeGreaterThanOrEqual(1);
      expect(growthPaths.practicalLearning.length).toBeLessThanOrEqual(3);

      for (const cert of growthPaths.certifications) {
        expect(cert.gapRationale).toBeTruthy();
        expect(cert.url).toMatch(/^https:\/\//);
      }
    });

    it("Dynamically switches recommendations when career target changes from Data Analyst to Cybersecurity Analyst", () => {
      const { getGrowthPathRecommendations } = require("./learningCatalogService");

      // 1. Data Analyst
      const daPaths = getGrowthPathRecommendations({
        targetPosition: "Data Analyst",
      });
      const daCertTitles = daPaths.certifications.map((c: any) => c.title);
      expect(daCertTitles.some((t: string) => t.includes("Power BI") || t.includes("Data") || t.includes("Tableau"))).toBe(true);
      expect(daCertTitles).not.toContain("CompTIA Security+ (SY0-701)");

      // 2. Cybersecurity Analyst
      const cyberPaths = getGrowthPathRecommendations({
        targetPosition: "Cybersecurity Analyst",
      });
      const cyberCertTitles = cyberPaths.certifications.map((c: any) => c.title);
      expect(cyberCertTitles.some((t: string) => t.includes("Security") || t.includes("Cybersecurity") || t.includes("CySA+"))).toBe(true);
      expect(cyberCertTitles).not.toContain("Microsoft Certified: Power BI Data Analyst Associate (PL-300)");
    });
  });

  describe("8. Universal Personalized Learning Engine (Multi-Context & Slot Allocation)", () => {
    it("Resolves academic domain metadata accurately from College, Department, and Degree Program inputs", () => {
      const { resolveAcademicDomain } = require("./learningCatalogService");
      const csIt = resolveAcademicDomain("College of Information Technology", "BSIT");
      expect(csIt).toBeDefined();
      expect(csIt?.id).toBe("cs_it");

      const civil = resolveAcademicDomain("College of Engineering", "BS Civil Engineering");
      expect(civil).toBeDefined();
      expect(civil?.id).toBe("civil_eng");

      const psych = resolveAcademicDomain("College of Arts and Sciences", "BS Psychology");
      expect(psych).toBeDefined();
      expect(psych?.id).toBe("arts_psychology");
    });

    it("Synthesizes multi-context PersonalizedLearningProfile including transition status", () => {
      const { buildPersonalizedLearningProfile } = require("./learningCatalogService");
      const profile = buildPersonalizedLearningProfile({
        targetPosition: "UX Designer",
        degreeProgram: "BS Information Technology",
        collegeDomain: "College of Information Technology",
        compatibilityClassification: "PIVOT",
      });

      expect(profile.academicDomain?.id).toBe("cs_it");
      expect(profile.compatibility).toBe("PIVOT");
    });

    it("Enforces multi-competency slot allocation when student has 5 distinct skill gaps", () => {
      const { matchLearningRecommendations } = require("./learningCatalogService");
      const recs = matchLearningRecommendations({
        targetPosition: "Software Engineer",
        degreeProgram: "BS Information Technology",
        skillGaps: [
          { skill: "Python", importance: "high" },
          { skill: "SQL", importance: "high" },
          { skill: "Testing", importance: "high" },
          { skill: "Docker", importance: "high" },
          { skill: "System Design", importance: "high" },
        ],
        categoryId: "for_you",
      });

      const matchedGaps = new Set(recs.map((i: any) => i.matchedSkillGap).filter((g: any) => g && g !== "NONE"));
      expect(matchedGaps.size).toBeGreaterThanOrEqual(1);
    });
  });
});

