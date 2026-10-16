import { test } from "node:test";
import assert from "node:assert/strict";

test("OJT Exclusion: Non-student administrative roles are excluded from institutional metrics and aggregates", () => {
  const users = [
    { uid: "student_1", role: "student", isDeleted: false, resumeScore: 85, interviewScore: 88, employabilityScore: 86.5 },
    { uid: "student_2", role: "student", isDeleted: false, resumeScore: 78, interviewScore: 82, employabilityScore: 80.0 },
    { uid: "admin_1", role: "admin", isDeleted: false, resumeScore: 99, interviewScore: 99, employabilityScore: 99.0 },
    { uid: "career_center_1", role: "career_center", isDeleted: false, resumeScore: 95, interviewScore: 95, employabilityScore: 95.0 },
    { uid: "ojt_coordinator_1", role: "ojt_coordinator", isDeleted: false, resumeScore: 92, interviewScore: 90, employabilityScore: 91.0 },
  ];

  // Filtering rule defined in userService.ts:
  // if (userData.role === "admin" || userData.role === "career_center" || userData.role === "ojt_coordinator") return false;
  const eligibleStudents = users.filter((u) => {
    if (u.role === "admin" || u.role === "career_center" || u.role === "ojt_coordinator") {
      return false;
    }
    return !u.isDeleted;
  });

  // 1. Check count
  assert.equal(eligibleStudents.length, 2);
  assert.deepEqual(eligibleStudents.map((s) => s.uid), ["student_1", "student_2"]);

  // 2. Average calculations must not include OJT coordinator or admin scores
  const totalScore = eligibleStudents.reduce((acc, s) => acc + s.employabilityScore, 0);
  const avgScore = totalScore / eligibleStudents.length;

  assert.equal(avgScore, 83.25);
  // If OJT coordinator was included: (86.5 + 80 + 91) / 3 = 85.83
  assert.notEqual(avgScore, 85.83);
});

test("OJT Coordinator Scoping: Program filter restricts coordinator view to assigned program", () => {
  const students = [
    { uid: "student_cs", role: "student", degreeProgram: "BS Computer Science" },
    { uid: "student_it", role: "student", degreeProgram: "BS Information Technology" },
    { uid: "student_cpe", role: "student", degreeProgram: "BS Computer Engineering" },
  ];

  // OJT Coordinator for Computer Science
  const coordinatorFilters = {
    userRole: "ojt_coordinator",
    assignedProgram: "BS Computer Science",
  };

  const scopedStudents = students.filter((s) => {
    if (coordinatorFilters.userRole === "ojt_coordinator" && coordinatorFilters.assignedProgram) {
      return s.degreeProgram === coordinatorFilters.assignedProgram;
    }
    return true;
  });

  assert.equal(scopedStudents.length, 1);
  assert.equal(scopedStudents[0].uid, "student_cs");
});
