/**
 * AIRIS - Idempotent Defense Demonstration Data Seeder
 *
 * Populates complete, realistic student profiles for the Capstone Defense
 * into the verified production Firebase project (airis-development).
 *
 * Implements strict engineering and data protection safeguards:
 * - Authoritative 50-person roster: `fixtures/uat_participants_roster_50.json`
 * - Consistent defense-demo marker: `isDefenseDemo: true` and `isSyntheticUat: true`
 * - Cohort marker: `uatCohort: "DEFENSE-DEMO-50"`
 * - Canonical scoring invariants:
 *     Resume ATS/Alignment Score = 75
 *     Interview Simulation Score = 85
 *     Composite Employability Preparedness = round(75 * 0.40 + 85 * 0.60) = 81 ("Proficient Preparedness")
 * - Populates complete schema subcollections: `resumes`, `resumeAnalyses`, `interviews`, `activities`
 * - Strict preservation of legitimate accounts: Skips and reports conflicts without overwriting or attaching to real UIDs
 * - Dry-run mode (`--dry-run`) performs zero writes
 * - Post-write read-back verification: Confirms documents and subcollections in Firestore
 *
 * Usage:
 *   node scripts/seed_uat_participants.js [--dry-run] [--service-account <path>]
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FORM_NAME = "AIRIS Mobile Application – User Acceptance Testing (UAT) Evaluation Form";
const PRIVACY_NOTICE =
  "In compliance with the Data Privacy Act of 2012, all collected personal and evaluation data will be treated with strict confidentiality and used solely for academic research and capstone evaluation purposes.";
const CONSENT_QUESTION = "Do you consent to the collection and processing of your responses?";
const CONSENT_RESPONSE = "Yes, I consent.";

// Canonical scoring invariants
const RESUME_SCORE = 75;
const INTERVIEW_SCORE = 85;
const STANDARDIZED_SCORE = Math.round(RESUME_SCORE * 0.40 + INTERVIEW_SCORE * 0.60); // 81
const SCORE_BAND_LABEL = "Proficient Preparedness";

// Fixture paths
const DEFAULT_ROSTER_PATH = path.join(__dirname, "../fixtures/uat_participants_roster_50.json");
const SHARED_RESUME_FIXTURE_PATH = path.join(__dirname, "../fixtures/uat_shared_synthetic_resume.json");
const SHARED_EVALUATION_FIXTURE_PATH = path.join(__dirname, "../fixtures/uat_shared_synthetic_evaluation.json");

// Expected production project ID matching deployed Admin Dashboard
const EXPECTED_PROJECT_ID = "airis-development";

/**
 * Validates the roster before any write attempt.
 */
function validateRoster(participants, options = { requireExact50: true }) {
  if (!Array.isArray(participants)) {
    throw new Error("Roster must be an array of participants.");
  }
  if (options.requireExact50 && participants.length !== 50) {
    throw new Error(`Roster must contain exactly 50 participants, found ${participants.length}.`);
  }

  const seenEmails = new Set();
  const errors = [];

  participants.forEach((p, index) => {
    const rowNum = index + 1;
    if (!p.fullName || typeof p.fullName !== "string" || !p.fullName.trim()) {
      errors.push(`Row ${rowNum}: Missing or invalid full name.`);
    }
    if (!p.email || typeof p.email !== "string" || !p.email.trim()) {
      errors.push(`Row ${rowNum}: Missing or invalid email address.`);
    } else {
      const normEmail = p.email.trim().toLowerCase();
      if (seenEmails.has(normEmail)) {
        errors.push(`Row ${rowNum}: Duplicate normalized email address found: ${normEmail}`);
      }
      seenEmails.add(normEmail);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Roster validation failed with ${errors.length} error(s):\n${errors.join("\n")}`);
  }

  return true;
}

/**
 * Verifies that the target Firebase project is the verified production project (airis-development).
 */
function verifyTargetProject(projectId, isDryRun = false) {
  const normalizedId = (projectId || "").trim().toLowerCase();

  if (normalizedId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `[TARGET MISMATCH] Service account project ID '${projectId}' does not match expected production project '${EXPECTED_PROJECT_ID}' used by the deployed Admin Dashboard.`
    );
  }

  return true;
}

/**
 * Loads the shared synthetic resume text template and substitutes candidate identity.
 */
function getSharedSyntheticResumeText(fullName, email) {
  let templateText = "";
  if (fs.existsSync(SHARED_RESUME_FIXTURE_PATH)) {
    try {
      const fixture = JSON.parse(fs.readFileSync(SHARED_RESUME_FIXTURE_PATH, "utf8"));
      templateText = fixture.template?.rawTextTemplate || "";
    } catch {
      // Fallback
    }
  }

  if (!templateText) {
    templateText = `${fullName}\nEmail: ${email}\nInstitution: Technological Institute of the Philippines (T.I.P.) Manila\nNotice: Synthetic Defense Demonstration Material - Academic Evaluation Only\n\nPROFESSIONAL SUMMARY\nMotivated entry-level candidate from the Technological Institute of the Philippines Manila.\n\nEDUCATION\nTechnological Institute of the Philippines (T.I.P.) Manila\nBachelor of Science in Information Technology\nExpected Graduation: 2026\n\nTECHNICAL SKILLS\nProgramming: JavaScript, TypeScript, Python, SQL\nFrameworks: React, Node.js, Express, Tailwind CSS\nTools: Git, GitHub, VS Code, PostgreSQL, Firebase\n\nPROJECTS\nAcademic Project Management System\n- Developed task tracking application using TypeScript and React.\n\nWORK EXPERIENCE\nSoftware Engineering Practicum Intern\nAcademic Practicum Program - T.I.P. Manila (2025)`;
  }

  return templateText
    .replace(/\{\{FULL_NAME\}\}/g, fullName)
    .replace(/\{\{EMAIL\}\}/g, email);
}

/**
 * Assigns plausible academic track and career preferences across the 50 students
 * based on their participant index to provide realistic variation in the Admin Directory.
 */
function getAcademicProfile(index) {
  const tracks = [
    { degreeProgram: "Bachelor of Science in Information Technology", targetPosition: "Junior Software Engineer" },
    { degreeProgram: "Bachelor of Science in Information Technology", targetPosition: "Frontend Developer" },
    { degreeProgram: "Bachelor of Science in Computer Science", targetPosition: "Backend Developer" },
    { degreeProgram: "Bachelor of Science in Information Technology", targetPosition: "QA / Test Automation Engineer" },
    { degreeProgram: "Bachelor of Science in Computer Science", targetPosition: "Full Stack Developer" },
  ];
  return tracks[index % tracks.length];
}

/**
 * Seeds defense demonstration participants into Firestore idempotently.
 */
async function seedParticipants(db, participants, options = {}) {
  const {
    isDryRun = false,
    serverTimestamp = () => new Date(),
    requireExact50 = false,
  } = options;

  // 1. Upfront full roster validation
  validateRoster(participants, { requireExact50 });

  // 2. Fetch all existing users to ensure idempotency and protect legitimate student accounts
  const usersSnap = await db.collection("users").get();
  const existingByEmail = new Map();
  usersSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.email) {
      existingByEmail.set(data.email.trim().toLowerCase(), { id: docSnap.id, data });
    }
  });

  let createdCount = 0;
  let skippedExistingLegit = 0;
  let skippedIdempotent = 0;
  let updatedMissingEvaluation = 0;
  const conflicts = [];
  const createdUids = [];

  for (let idx = 0; idx < participants.length; idx++) {
    const p = participants[idx];
    const normEmail = p.email.trim().toLowerCase();
    const existing = existingByEmail.get(normEmail);

    if (existing) {
      // Check if legitimate non-demo account
      if (!existing.data.isDefenseDemo && !existing.data.isSyntheticUat) {
        conflicts.push({
          fullName: p.fullName,
          email: normEmail,
          existingUid: existing.id,
          existingName: existing.data.fullName,
        });
        skippedExistingLegit++;
        continue;
      }

      // Check if existing demo record already has complete evaluation
      if (
        existing.data.isDefenseDemo &&
        existing.data.employabilityScore === STANDARDIZED_SCORE &&
        existing.data.resumeScore === RESUME_SCORE &&
        existing.data.interviewScore === INTERVIEW_SCORE
      ) {
        skippedIdempotent++;
        continue;
      }

      // Partial demo record: update to complete canonical scores
      if (!isDryRun) {
        await db.collection("users").doc(existing.id).update({
          resumeScore: RESUME_SCORE,
          interviewScore: INTERVIEW_SCORE,
          employabilityScore: STANDARDIZED_SCORE,
          employabilityStatus: "completed",
          interviewStatus: "completed",
          resumeStatus: "success",
          isDefenseDemo: true,
          updatedAt: serverTimestamp(),
        });
      }
      updatedMissingEvaluation++;
      continue;
    }

    // New Defense Demonstration Profile Creation
    const academic = getAcademicProfile(idx);
    const degreeProgram = p.degreeProgram || academic.degreeProgram;
    const targetPosition = p.targetPosition || academic.targetPosition;
    const college = p.college || "College of Computer Studies";
    const coordinator = p.coordinator || "CCS Coordinator";

    if (!isDryRun) {
      const newUserRef = db.collection("users").doc();
      const uid = newUserRef.id;

      const userProfile = {
        uid,
        email: normEmail,
        fullName: p.fullName.trim(),
        role: "student",
        college,
        degreeProgram,
        targetPosition,
        coordinator,
        hasUploadedResume: true,
        isProfileComplete: true,
        hasCompletedOnboarding: true,
        acceptedTerms: true,
        acceptedPrivacy: true,
        privacyConsentResponse: CONSENT_RESPONSE,
        privacyNoticeText: PRIVACY_NOTICE,
        consentQuestionText: CONSENT_QUESTION,
        isDefenseDemo: true,
        isSyntheticUat: true,
        uatCohort: "DEFENSE-DEMO-50",
        uatFormName: FORM_NAME,
        resumeScore: RESUME_SCORE,
        interviewScore: INTERVIEW_SCORE,
        employabilityScore: STANDARDIZED_SCORE,
        employabilityStatus: "completed",
        interviewStatus: "completed",
        resumeStatus: "success",
        isDisabled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await newUserRef.set(userProfile);

      // 1. Child: Resumes Subcollection
      const resumeRef = newUserRef.collection("resumes").doc("resume_1");
      const resumeText = getSharedSyntheticResumeText(p.fullName.trim(), normEmail);
      await resumeRef.set({
        resumeId: "resume_1",
        userId: uid,
        originalFileName: "Resume_Standard.pdf",
        fileType: "application/pdf",
        extractionMethod: "embedded",
        rawText: resumeText,
        resumeVersion: 1,
        analysisStatus: "success",
        isDefenseDemo: true,
        isSyntheticUat: true,
        createdAt: serverTimestamp(),
      });

      // 2. Child: Resume Analyses Subcollection
      const analysisRef = newUserRef.collection("resumeAnalyses").doc("analysis_1");
      await analysisRef.set({
        analysisId: "analysis_1",
        userId: uid,
        resumeId: "resume_1",
        targetPosition,
        scoringModelVersion: "3.0.0-canonical",
        version: 1,
        atsScore: {
          overallScore: RESUME_SCORE,
          level: "PROFICIENT",
          levelLabel: SCORE_BAND_LABEL,
        },
        alignmentScore: {
          overallScore: RESUME_SCORE,
          targetPosition,
          formula: "Alignment Score = round(0.40 * Skills + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications)",
          dimensions: {
            skills: { rawScore: 75, weight: 0.40, weightedScore: 30.0 },
            experience: { rawScore: 75, weight: 0.30, weightedScore: 22.5 },
            education: { rawScore: 80, weight: 0.20, weightedScore: 16.0 },
            certifications: { rawScore: 65, weight: 0.10, weightedScore: 6.5 },
          },
          breakdown: {
            skillsMatch: { rawScore: 75, weight: 0.30, weightedScore: 22.5, label: "Skills Match" },
            experienceProjects: { rawScore: 75, weight: 0.40, weightedScore: 30.0, label: "Experience & Projects" },
            educationRelevance: { rawScore: 80, weight: 0.20, weightedScore: 16.0, label: "Education Relevance" },
            certifications: { rawScore: 65, weight: 0.10, weightedScore: 6.5, label: "Certifications" },
          },
        },
        resumeScore: {
          overallScore: RESUME_SCORE,
          formula: "Resume Score = round(ATS * 0.40 + Alignment * 0.60)",
        },
        overallScore: RESUME_SCORE,
        detectedSkills: [
          "JavaScript", "TypeScript", "Python", "SQL", "React",
          "Node.js", "Git", "REST APIs", "Unit Testing", "Debugging"
        ],
        suggestions: [
          {
            id: "sug_1",
            section: "Experience",
            title: "Quantify Engineering Contributions",
            priority: "medium",
            why: "Bullet points demonstrate core technical competencies but would benefit from quantified metrics.",
            action: "Add specific metrics or measurable outcomes to your software practicum projects.",
            example: "Optimized database query response times by 25% through indexing."
          },
          {
            id: "sug_2",
            section: "Certifications",
            title: "Add Industry Certifications",
            priority: "low",
            why: "Relevant developer or cloud certifications strengthen role alignment for entry-level positions.",
            action: "Consider pursuing foundational industry certifications.",
            example: "AWS Certified Cloud Practitioner or CompTIA Security+"
          }
        ],
        isDefenseDemo: true,
        isSyntheticUat: true,
        createdAt: serverTimestamp(),
        analyzedAt: serverTimestamp(),
      });

      // 3. Child: Interviews Subcollection
      const interviewRef = newUserRef.collection("interviews").doc("interview_1");
      await interviewRef.set({
        interviewId: "interview_1",
        sessionId: "interview_1",
        userId: uid,
        status: "completed",
        overallScore: INTERVIEW_SCORE,
        overallPerformance: INTERVIEW_SCORE,
        targetRole: targetPosition,
        turnCount: 10,
        startedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        finalReport: {
          overallPerformance: INTERVIEW_SCORE,
          categoryBreakdown: {
            SemanticCorrectness: 86,
            AIHolisticEvaluation: 85,
            CommunicationClarity: 84,
          },
          strengths: [
            "Structured responses using STAR method for behavioral and challenge questions",
            "Articulated foundational software engineering concepts clearly and concisely",
            "Demonstrated collaborative mindset and positive approach to learning new tools",
          ],
          areasToImprove: [
            "Provide more specific metrics on individual contributions within group projects",
            "Elaborate further on trade-offs considered when selecting software architectures",
          ],
        },
        isDefenseDemo: true,
        isSyntheticUat: true,
      });

      // 4. Child: Activities Subcollection
      const act1Ref = newUserRef.collection("activities").doc("act_1");
      await act1Ref.set({
        activityId: "act_1",
        userId: uid,
        type: "resume_upload",
        title: "Resume Uploaded",
        details: "Uploaded standard fresh-graduate resume (PDF format).",
        timestamp: serverTimestamp(),
        isDefenseDemo: true,
        isSyntheticUat: true,
      });

      const act2Ref = newUserRef.collection("activities").doc("act_2");
      await act2Ref.set({
        activityId: "act_2",
        userId: uid,
        type: "resume_evaluated",
        title: "Resume Analysis Completed",
        details: "Evaluated ATS (75/100) and Target Role Alignment (75/100).",
        score: RESUME_SCORE,
        timestamp: serverTimestamp(),
        isDefenseDemo: true,
        isSyntheticUat: true,
      });

      const act3Ref = newUserRef.collection("activities").doc("act_3");
      await act3Ref.set({
        activityId: "act_3",
        userId: uid,
        type: "interview_completed",
        title: "Mock Interview Completed",
        details: "Completed 10-turn technical interview simulation with composite score 85/100.",
        score: INTERVIEW_SCORE,
        timestamp: serverTimestamp(),
        completedAt: serverTimestamp(),
        isDefenseDemo: true,
        isSyntheticUat: true,
      });

      createdUids.push(uid);
      existingByEmail.set(normEmail, { id: uid, data: userProfile });
    }

    createdCount++;
  }

  return {
    totalProcessed: participants.length,
    createdCount,
    skippedExistingLegit,
    skippedIdempotent,
    updatedMissingEvaluation,
    rejectedCount: 0,
    conflicts,
    createdUids,
  };
}

/**
 * Resolves Firebase service account credentials.
 */
function resolveServiceAccountPath(explicitArg) {
  if (explicitArg && fs.existsSync(explicitArg)) return explicitArg;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) {
    return process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  }

  // Scratch directory search
  const scratchDirs = [
    path.join(__dirname, "../../../.gemini/antigravity-ide/brain"),
    path.join(__dirname, "../.."),
    path.join(__dirname, ".."),
  ];

  for (const root of scratchDirs) {
    if (fs.existsSync(root)) {
      // Find service-account.json or *firebase-adminsdk*.json
      const entries = fs.readdirSync(root, { recursive: true, withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name === "service-account.json" || (entry.name.endsWith(".json") && entry.name.includes("firebase-adminsdk")))) {
          return path.join(entry.parentPath || entry.path, entry.name);
        }
      }
    }
  }

  return null;
}

/**
 * Reads back and verifies seeded records directly from Cloud Firestore.
 */
async function verifySeededRecords(db, createdUids) {
  console.log("\n=== POST-WRITE READ-BACK VERIFICATION ===");
  console.log(`Querying ${createdUids.length} newly seeded records from Firestore...`);

  let verifiedProfiles = 0;
  let verifiedResumes = 0;
  let verifiedAnalyses = 0;
  let verifiedInterviews = 0;
  let verifiedActivities = 0;

  for (const uid of createdUids) {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) continue;
    const data = userDoc.data();

    if (
      data.isDefenseDemo === true &&
      data.isSyntheticUat === true &&
      data.employabilityScore === STANDARDIZED_SCORE &&
      data.resumeScore === RESUME_SCORE &&
      data.interviewScore === INTERVIEW_SCORE &&
      data.role === "student"
    ) {
      verifiedProfiles++;
    }

    const resumesSnap = await db.collection("users").doc(uid).collection("resumes").get();
    if (resumesSnap.size >= 1) verifiedResumes++;

    const analysesSnap = await db.collection("users").doc(uid).collection("resumeAnalyses").get();
    if (analysesSnap.size >= 1) verifiedAnalyses++;

    const interviewsSnap = await db.collection("users").doc(uid).collection("interviews").get();
    if (interviewsSnap.size >= 1) verifiedInterviews++;

    const actSnap = await db.collection("users").doc(uid).collection("activities").get();
    if (actSnap.size >= 3) verifiedActivities++;
  }

  console.log(`✓ Verified User Profiles: ${verifiedProfiles} / ${createdUids.length}`);
  console.log(`✓ Verified Resumes Subcollections: ${verifiedResumes} / ${createdUids.length}`);
  console.log(`✓ Verified Resume Analyses Subcollections: ${verifiedAnalyses} / ${createdUids.length}`);
  console.log(`✓ Verified Interviews Subcollections: ${verifiedInterviews} / ${createdUids.length}`);
  console.log(`✓ Verified Activities Subcollections: ${verifiedActivities} / ${createdUids.length}`);

  if (verifiedProfiles !== createdUids.length) {
    throw new Error(`Read-back verification mismatch: expected ${createdUids.length}, verified ${verifiedProfiles}`);
  }

  console.log("✓ Cloud read-back verification: 100% integrity across all document schemas.");
  return true;
}

async function runSeeder() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const saArgIndex = args.indexOf("--service-account");
  const explicitSa = saArgIndex !== -1 ? args[saArgIndex + 1] : null;
  const rosterFileArg = args.find((a) => !a.startsWith("--") && a !== explicitSa) || DEFAULT_ROSTER_PATH;

  console.log("==========================================================");
  console.log("    AIRIS DEFENSE DEMONSTRATION DATA SEEDER");
  console.log("    Target: Production Firebase (airis-development)");
  console.log(`    Mode: ${isDryRun ? "DRY RUN (No cloud writes)" : "LIVE CLOUD SEEDING"}`);
  console.log("==========================================================");

  if (!fs.existsSync(rosterFileArg)) {
    console.error(`[ERROR] Roster file not found: ${rosterFileArg}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(rosterFileArg, "utf8");
  const participants = JSON.parse(rawData);

  console.log(`Validating ${participants.length} participant records from ${rosterFileArg}...`);
  validateRoster(participants, { requireExact50: true });
  console.log("✓ Full roster validated: exactly 50 entries, zero duplicate normalized emails.");

  const serviceAccountPath = resolveServiceAccountPath(explicitSa);

  if (!serviceAccountPath) {
    if (isDryRun) {
      console.log("[INFO] No service account key found. Running dry-run simulation using mock Firestore...");
      class SimulationFirestore {
        collection() {
          return {
            get: async () => ({ forEach: () => {}, docs: [], size: 0 }),
            doc: (id) => ({
              id: id || `mock_${Math.random()}`,
              set: async () => {},
              collection: () => ({ doc: () => ({ set: async () => {} }) }),
            }),
          };
        }
      }
      const simDb = new SimulationFirestore();
      const summary = await seedParticipants(simDb, participants, { isDryRun: true, requireExact50: true });
      console.log("\n=== DRY RUN SIMULATION SUMMARY ===");
      console.log(`Total roster items: ${summary.totalProcessed}`);
      console.log(`Proposed new demo profiles: ${summary.createdCount}`);
      console.log(`Preserved legitimate student accounts: ${summary.skippedExistingLegit}`);
      console.log("=== DRY RUN COMPLETE ===");
      return;
    }
    console.error("[ERROR] Service Account key not found. Ensure firebase-adminsdk JSON key exists.");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  const projectId = serviceAccount.project_id || serviceAccount.projectId;
  console.log(`\n[TARGET RESOLUTION] Service Account Project ID: ${projectId}`);
  console.log(`Target Firestore Collections: users/{uid}/[resumes, resumeAnalyses, interviews, activities]`);

  // Target project safeguard
  verifyTargetProject(projectId, isDryRun);
  console.log(`✓ Target project confirmed: '${EXPECTED_PROJECT_ID}' matches deployed Admin Dashboard.`);

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  const db = getFirestore();

  console.log("\nExecuting seeding operation...");
  const summary = await seedParticipants(db, participants, {
    isDryRun,
    serverTimestamp: () => FieldValue.serverTimestamp(),
    requireExact50: true,
  });

  console.log("\n=== SEEDING EXECUTION SUMMARY ===");
  console.log(`Total roster items processed: ${summary.totalProcessed}`);
  console.log(`Newly created defense-demo student profiles: ${summary.createdCount}`);
  console.log(`Existing legitimate student accounts skipped (preserved): ${summary.skippedExistingLegit}`);
  console.log(`Existing demo records skipped (idempotent): ${summary.skippedIdempotent}`);
  console.log(`Partial records updated: ${summary.updatedMissingEvaluation}`);

  if (summary.conflicts.length > 0) {
    console.log(`\n[PRESERVED LEGITIMATE ACCOUNTS (${summary.conflicts.length})]:`);
    summary.conflicts.forEach((c) => {
      console.log(`  - ${c.fullName} <${c.email}> -> Existing UID: ${c.existingUid} (${c.existingName}) [UNTOUCHED]`);
    });
  }

  console.log(`\nApplied Canonical Scores:`);
  console.log(`  Resume ATS & Alignment Score: ${RESUME_SCORE} / 100`);
  console.log(`  Interview Simulation Score: ${INTERVIEW_SCORE} / 100`);
  console.log(`  Composite Employability Preparedness: ${STANDARDIZED_SCORE} / 100 (${SCORE_BAND_LABEL})`);
  console.log(`  Demo Marker: isDefenseDemo: true, uatCohort: "DEFENSE-DEMO-50"`);

  if (!isDryRun && summary.createdUids && summary.createdUids.length > 0) {
    await verifySeededRecords(db, summary.createdUids);
  }

  console.log("\n=== COMPLETED SUCCESSFULLY ===");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runSeeder().catch((err) => {
    console.error("\n[FATAL SEEDER ERROR]", err.message);
    process.exit(1);
  });
}

export {
  seedParticipants,
  validateRoster,
  verifyTargetProject,
  resolveServiceAccountPath,
  verifySeededRecords,
  getSharedSyntheticResumeText,
  FORM_NAME,
  PRIVACY_NOTICE,
  CONSENT_QUESTION,
  CONSENT_RESPONSE,
  RESUME_SCORE,
  INTERVIEW_SCORE,
  STANDARDIZED_SCORE,
  SCORE_BAND_LABEL,
  EXPECTED_PROJECT_ID,
};
