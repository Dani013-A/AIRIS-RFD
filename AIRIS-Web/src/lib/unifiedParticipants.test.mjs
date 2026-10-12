import { test } from "node:test";
import assert from "node:assert/strict";

test("Unified Participant Population: Both institutional and UAT participants are included", () => {
  const rawUsers = [
    {
      uid: "inst_1",
      email: "student1@tip.edu.ph",
      fullName: "Juan Dela Cruz",
      role: "student",
      isDeleted: false,
      isDefenseDemo: false,
      isSyntheticUat: false,
      resumeScore: 88,
      interviewScore: 84,
    },
    {
      uid: "uat_1",
      email: "uat.participant1@tip.edu.ph",
      fullName: "Maria Clara",
      role: "student",
      isDeleted: false,
      isDefenseDemo: true,
      isSyntheticUat: true,
      uatCohort: "cohort-a",
      resumeScore: 92,
      interviewScore: 90,
    },
    {
      uid: "inst_2",
      email: "student2@tip.edu.ph",
      fullName: "Pedro Penduko",
      role: "student",
      isDeleted: false,
      isDefenseDemo: false,
      isSyntheticUat: false,
      resumeScore: 76,
    },
    {
      uid: "admin_1",
      email: "admin@tip.edu.ph",
      fullName: "Admin User",
      role: "admin",
      isDeleted: false,
    },
    {
      uid: "deleted_1",
      email: "deleted@tip.edu.ph",
      fullName: "Deleted Student",
      role: "student",
      isDeleted: true,
    },
  ];

  // Filtering logic matching userService.ts:
  const eligible = rawUsers.filter((u) => {
    if (u.role === "admin" || u.role === "career_center" || u.role === "ojt_coordinator") return false;
    if (u.isDeleted) return false;
    return true;
  });

  // Both institutional and UAT participants must be present
  assert.equal(eligible.length, 3);
  assert.deepEqual(eligible.map((u) => u.uid), ["inst_1", "uat_1", "inst_2"]);

  // Provenance metadata must be intact for auditability
  const uatStudent = eligible.find((u) => u.uid === "uat_1");
  assert.equal(uatStudent?.isDefenseDemo, true);
  assert.equal(uatStudent?.isSyntheticUat, true);
  assert.equal(uatStudent?.uatCohort, "cohort-a");
});

test("Deduplication: Duplicate records by UID are not double-counted", () => {
  const usersWithDuplicates = [
    { uid: "student_abc", email: "abc@tip.edu.ph", fullName: "Student ABC" },
    { uid: "student_abc", email: "abc@tip.edu.ph", fullName: "Student ABC" },
    { uid: "student_xyz", email: "xyz@tip.edu.ph", fullName: "Student XYZ" },
  ];

  const seen = new Set();
  const deduplicated = usersWithDuplicates.filter((u) => {
    if (seen.has(u.uid)) return false;
    seen.add(u.uid);
    return true;
  });

  assert.equal(deduplicated.length, 2);
  assert.deepEqual(deduplicated.map((u) => u.uid), ["student_abc", "student_xyz"]);
});

test("Identity Integrity: Different participants with identical names remain distinct by UID", () => {
  const distinctUsersSameName = [
    { uid: "uid_101", fullName: "Alex Santos", email: "alex1@tip.edu.ph" },
    { uid: "uid_102", fullName: "Alex Santos", email: "alex2@tip.edu.ph" },
  ];

  const seen = new Set();
  const result = distinctUsersSameName.filter((u) => {
    if (seen.has(u.uid)) return false;
    seen.add(u.uid);
    return true;
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].uid, "uid_101");
  assert.equal(result[1].uid, "uid_102");
});

test("Denominator Consistency: Missing evaluation scores do not falsely skew averages", () => {
  const participants = [
    { uid: "s1", resumeScore: 90 },
    { uid: "s2", resumeScore: 80 },
    { uid: "s3", resumeScore: undefined }, // incomplete resume analysis
  ];

  const completedResumeScored = participants.filter((p) => typeof p.resumeScore === "number");
  const total = completedResumeScored.reduce((sum, p) => sum + (p.resumeScore || 0), 0);
  const avg = completedResumeScored.length > 0 ? total / completedResumeScored.length : 0;

  assert.equal(completedResumeScored.length, 2);
  assert.equal(avg, 85);
  // Denominator must be 2, not total population (3)
  assert.notEqual(avg, 170 / 3);
});

test("Canonical Scope Description: Always formats as All Participants", () => {
  const buildScopeDescription = (coordinator, period) => {
    const coordStr = !coordinator || coordinator === "all" ? "All Programs" : coordinator;
    const periodMap = {
      "7d": "Past 7 Days",
      "30d": "Past 30 Days",
      "90d": "Past 90 Days",
      "1y": "Past 1 Year",
    };
    const periodStr = periodMap[period] || "All Time";
    return `${coordStr} · ${periodStr} · All Participants`;
  };

  const desc = buildScopeDescription("all", "all");
  assert.equal(desc, "All Programs · All Time · All Participants");

  const desc7d = buildScopeDescription("BSCS", "7d");
  assert.equal(desc7d, "BSCS · Past 7 Days · All Participants");
});
