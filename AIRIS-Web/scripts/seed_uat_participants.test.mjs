import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  seedParticipants,
  validateRoster,
  verifyTargetProject,
  FORM_NAME,
  PRIVACY_NOTICE,
  CONSENT_QUESTION,
  CONSENT_RESPONSE,
  RESUME_SCORE,
  INTERVIEW_SCORE,
  STANDARDIZED_SCORE,
  SCORE_BAND_LABEL,
  EXPECTED_PROJECT_ID,
} = await import("./seed_uat_participants.js");

// In-Memory Mock Firestore Implementation
class MockFirestore {
  constructor() {
    this.data = new Map(); // key: collectionPath -> Map(docId -> docData)
    this.subcollections = new Map(); // key: `${parentPath}/${docId}/${subcol}` -> Map(subDocId -> data)
  }

  collection(colName) {
    if (!this.data.has(colName)) {
      this.data.set(colName, new Map());
    }
    const colMap = this.data.get(colName);

    return {
      get: async () => {
        const docs = [];
        colMap.forEach((val, id) => {
          docs.push({
            id,
            data: () => ({ ...val }),
            ref: { id },
          });
        });
        return {
          docs,
          size: docs.length,
          forEach: (fn) => docs.forEach(fn),
        };
      },
      doc: (docId) => {
        const id = docId || `gen_id_${Math.random().toString(36).substring(2, 9)}`;
        return {
          id,
          get: async () => ({
            exists: colMap.has(id),
            id,
            data: () => (colMap.has(id) ? { ...colMap.get(id) } : undefined),
          }),
          set: async (docData) => {
            colMap.set(id, { ...docData });
          },
          update: async (patch) => {
            if (!colMap.has(id)) throw new Error(`Document ${id} not found`);
            colMap.set(id, { ...colMap.get(id), ...patch });
          },
          collection: (subName) => {
            const subKey = `${colName}/${id}/${subName}`;
            if (!this.subcollections.has(subKey)) {
              this.subcollections.set(subKey, new Map());
            }
            const subMap = this.subcollections.get(subKey);
            return {
              doc: (subId) => {
                const sId = subId || `sub_${Math.random().toString(36).substring(2, 9)}`;
                return {
                  id: sId,
                  set: async (data) => {
                    subMap.set(sId, { ...data });
                  },
                };
              },
            };
          },
        };
      },
    };
  }
}

// ---------------------------------------------------------------------------
// 1. Roster and Fixtures Verification
// ---------------------------------------------------------------------------

test("Roster and Fixtures: 50-person roster exact integrity and uniqueness", () => {
  const fixturePath = path.join(__dirname, "../fixtures/uat_participants_roster_50.json");
  assert.ok(fs.existsSync(fixturePath), "50-participant roster fixture must exist");

  const participants = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(participants.length, 50, "Roster must contain exactly 50 entries");

  validateRoster(participants, { requireExact50: true });

  assert.equal(participants[0].fullName, "Jhon Marvin Oric");
  assert.equal(participants[0].email, "mjmomunoz@tip.edu.ph");

  assert.equal(participants[4].fullName, "Althea Aeryn M. Dela Cruz");
  assert.equal(participants[4].email, "maadelacruz01@tip.edu.ph");

  assert.equal(participants[21].fullName, "Prince blendoel vetonio");
  assert.equal(participants[21].email, "mpbvetonio@tip.edu.ph");

  assert.equal(participants[48].fullName, "ERNEST PONCE");
  assert.equal(participants[48].email, "meponce@tip.edu.ph");

  assert.equal(participants[49].fullName, "BUENAOBRA, NOEL JOSEPH T.");
  assert.equal(participants[49].email, "mnjbuenaobra@tip.edu.ph");
});

test("Roster and Fixtures: Exact form name, privacy notice, consent question, and response", () => {
  assert.equal(FORM_NAME, "AIRIS Mobile Application – User Acceptance Testing (UAT) Evaluation Form");
  assert.equal(
    PRIVACY_NOTICE,
    "In compliance with the Data Privacy Act of 2012, all collected personal and evaluation data will be treated with strict confidentiality and used solely for academic research and capstone evaluation purposes."
  );
  assert.equal(CONSENT_QUESTION, "Do you consent to the collection and processing of your responses?");
  assert.equal(CONSENT_RESPONSE, "Yes, I consent.");
});

test("Roster and Fixtures: Canonical scoring formula and component derivation", () => {
  assert.equal(RESUME_SCORE, 75);
  assert.equal(INTERVIEW_SCORE, 85);
  const computed = Math.round(75 * 0.40 + 85 * 0.60);
  assert.equal(computed, 81);
  assert.equal(STANDARDIZED_SCORE, 81);
  assert.equal(SCORE_BAND_LABEL, "Proficient Preparedness");
  assert.equal(EXPECTED_PROJECT_ID, "airis-development");
});

test("Roster and Fixtures: Shared synthetic resume and evaluation fixture files exist and are valid", () => {
  const resumeFixturePath = path.join(__dirname, "../fixtures/uat_shared_synthetic_resume.json");
  const evalFixturePath = path.join(__dirname, "../fixtures/uat_shared_synthetic_evaluation.json");

  assert.ok(fs.existsSync(resumeFixturePath), "Shared resume fixture must exist");
  assert.ok(fs.existsSync(evalFixturePath), "Shared evaluation fixture must exist");

  const resumeData = JSON.parse(fs.readFileSync(resumeFixturePath, "utf8"));
  const evalData = JSON.parse(fs.readFileSync(evalFixturePath, "utf8"));

  assert.equal(resumeData.isSyntheticUat, true);
  assert.equal(evalData.isSyntheticUat, true);
  assert.equal(evalData.metrics.employabilityScore, 81);
  assert.equal(evalData.metrics.resumeScore, 75);
  assert.equal(evalData.metrics.interviewScore, 85);
  assert.equal(evalData.metrics.scoreBand, "Proficient Preparedness");
  assert.equal(evalData.uatForm.formName, FORM_NAME);
  assert.equal(evalData.uatForm.consentResponse, CONSENT_RESPONSE);
});

// ---------------------------------------------------------------------------
// 2. Target Project Safeguards
// ---------------------------------------------------------------------------

test("Target Safeguards: Validates target project is airis-development and rejects mismatches", () => {
  assert.equal(verifyTargetProject("airis-development"), true);

  assert.throws(
    () => {
      verifyTargetProject("random-project-id", false);
    },
    /TARGET MISMATCH/,
    "Must throw when trying to seed an unexpected project"
  );
});

test("Seeder Safeguards: Rejects duplicate emails and malformed rosters before any write", () => {
  const invalidRoster = [
    { fullName: "Test One", email: "test.one@tip.edu.ph" },
    { fullName: "Test Two", email: "TEST.ONE@TIP.EDU.PH" },
  ];

  assert.throws(
    () => {
      validateRoster(invalidRoster, { requireExact50: false });
    },
    /Duplicate normalized email address found/
  );

  const missingNameRoster = [{ fullName: "", email: "valid@tip.edu.ph" }];
  assert.throws(
    () => {
      validateRoster(missingNameRoster, { requireExact50: false });
    },
    /Missing or invalid full name/
  );
});

// ---------------------------------------------------------------------------
// 3. Seeder Execution and Idempotency
// ---------------------------------------------------------------------------

test("Seeder Execution: Dry-run performs zero writes", async () => {
  const fixturePath = path.join(__dirname, "../fixtures/uat_participants_roster_50.json");
  const participants = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const db = new MockFirestore();

  const summary = await seedParticipants(db, participants, {
    isDryRun: true,
    requireExact50: true,
  });

  assert.equal(summary.totalProcessed, 50);
  assert.equal(summary.createdCount, 50);

  const users = await db.collection("users").get();
  assert.equal(users.size, 0, "Dry run must perform zero writes");
});

test("Seeder Execution: Seeds defense demonstration profiles with complete subcollections", async () => {
  const fixturePath = path.join(__dirname, "../fixtures/uat_participants_roster_50.json");
  const participants = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const db = new MockFirestore();

  const summary = await seedParticipants(db, participants, {
    isDryRun: false,
    serverTimestamp: () => new Date("2026-10-11T12:00:00Z"),
    requireExact50: true,
  });

  assert.equal(summary.totalProcessed, 50);
  assert.equal(summary.createdCount, 50);
  assert.equal(summary.skippedExistingLegit, 0);

  const users = await db.collection("users").get();
  assert.equal(users.size, 50);

  for (const doc of users.docs) {
    const data = doc.data();
    assert.equal(data.isDefenseDemo, true);
    assert.equal(data.isSyntheticUat, true);
    assert.equal(data.uatCohort, "DEFENSE-DEMO-50");
    assert.equal(data.resumeScore, 75);
    assert.equal(data.interviewScore, 85);
    assert.equal(data.employabilityScore, 81);
    assert.equal(data.role, "student");
    assert.equal(data.college, "College of Computer Studies");
    assert.ok(data.degreeProgram, "degreeProgram must be populated");
    assert.ok(data.targetPosition, "targetPosition must be populated");

    // Check subcollection resumes
    const resumesKey = `users/${doc.id}/resumes`;
    const resMap = db.subcollections.get(resumesKey);
    assert.ok(resMap && resMap.size >= 1, `Must have resume subcollection for ${data.email}`);
    const resDoc = Array.from(resMap.values())[0];
    assert.equal(resDoc.isDefenseDemo, true);
    assert.ok(resDoc.rawText.includes(data.fullName));

    // Check subcollection resumeAnalyses
    const analysesKey = `users/${doc.id}/resumeAnalyses`;
    const subMap = db.subcollections.get(analysesKey);
    assert.ok(subMap && subMap.size >= 1, `Must have resumeAnalyses doc for ${data.email}`);
    const analysisDoc = Array.from(subMap.values())[0];
    assert.equal(analysisDoc.atsScore.overallScore, 75);
    assert.equal(analysisDoc.atsScore.levelLabel, "Proficient Preparedness");
    assert.equal(analysisDoc.alignmentScore.overallScore, 75);
    assert.ok(analysisDoc.alignmentScore.breakdown.skillsMatch);
    assert.ok(analysisDoc.alignmentScore.breakdown.experienceProjects);
    assert.ok(analysisDoc.alignmentScore.breakdown.educationRelevance);
    assert.ok(analysisDoc.alignmentScore.breakdown.certifications);
    assert.equal(analysisDoc.isDefenseDemo, true);

    // Check subcollection interviews
    const interviewsKey = `users/${doc.id}/interviews`;
    const intMap = db.subcollections.get(interviewsKey);
    assert.ok(intMap && intMap.size >= 1);
    const intDoc = Array.from(intMap.values())[0];
    assert.equal(intDoc.overallScore, 85);
    assert.equal(intDoc.finalReport.overallPerformance, 85);
    assert.equal(intDoc.finalReport.categoryBreakdown.SemanticCorrectness, 86);
    assert.equal(intDoc.finalReport.categoryBreakdown.AIHolisticEvaluation, 85);
    assert.equal(intDoc.finalReport.categoryBreakdown.CommunicationClarity, 84);
    assert.equal(intDoc.isDefenseDemo, true);

    // Check subcollection activities
    const actKey = `users/${doc.id}/activities`;
    const actMap = db.subcollections.get(actKey);
    assert.ok(actMap && actMap.size >= 3, `Must have 3 activities for ${data.email}`);
  }
});

test("Seeder Execution: Strictly idempotent on rerun with zero duplicate records", async () => {
  const fixturePath = path.join(__dirname, "../fixtures/uat_participants_roster_50.json");
  const participants = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const db = new MockFirestore();

  const run1 = await seedParticipants(db, participants, { isDryRun: false, requireExact50: true });
  assert.equal(run1.createdCount, 50);

  const run2 = await seedParticipants(db, participants, { isDryRun: false, requireExact50: true });
  assert.equal(run2.createdCount, 0);
  assert.equal(run2.skippedIdempotent, 50);

  const usersAfter = await db.collection("users").get();
  assert.equal(usersAfter.size, 50);
});

test("Seeder Execution: Preserves legitimate existing accounts and reports conflicts", async () => {
  const db = new MockFirestore();

  await db.collection("users").doc("real_student_uid").set({
    uid: "real_student_uid",
    email: "mjmomunoz@tip.edu.ph",
    fullName: "Jhon Marvin Oric Muñoz",
    isDefenseDemo: false,
    isSyntheticUat: false,
    employabilityScore: 92,
  });

  const roster = [
    { fullName: "Jhon Marvin Oric", email: "MJMOMUNOZ@TIP.EDU.PH" },
    { fullName: "Ritchelle Nainggie", email: "mrnainggie@tip.edu.ph" },
  ];

  const summary = await seedParticipants(db, roster, { isDryRun: false, requireExact50: false });
  assert.equal(summary.createdCount, 1);
  assert.equal(summary.skippedExistingLegit, 1);
  assert.equal(summary.conflicts.length, 1);
  assert.equal(summary.conflicts[0].existingUid, "real_student_uid");

  const realDoc = await db.collection("users").doc("real_student_uid").get();
  assert.equal(realDoc.data().fullName, "Jhon Marvin Oric Muñoz");
  assert.equal(realDoc.data().employabilityScore, 92);
  assert.equal(realDoc.data().isDefenseDemo, false);
});
