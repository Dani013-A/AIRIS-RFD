import assert from "node:assert/strict";
import test from "node:test";
import { sortStudentRoster } from "./sortStudentRoster.ts";

const students = [
  { uid: "a", fullName: "Ana", college: "CCS", resumeScore: 75, employabilityScore: 80 },
  { uid: "b", fullName: "Bea", college: "CEA", resumeScore: 91 },
  { uid: "c", fullName: "Cal", college: "CA", employabilityScore: 60 },
];

test("sorts names, colleges, and scores without inventing missing scores", () => {
  assert.deepEqual(sortStudentRoster(students, "name-desc").map((s) => s.uid), ["c", "b", "a"]);
  assert.deepEqual(sortStudentRoster(students, "college-asc").map((s) => s.uid), ["c", "a", "b"]);
  assert.deepEqual(sortStudentRoster(students, "resume-desc").map((s) => s.uid), ["b", "a", "c"]);
  assert.deepEqual(sortStudentRoster(students, "readiness-desc").map((s) => s.uid), ["a", "c", "b"]);
  assert.equal(students[0].uid, "a");
});
