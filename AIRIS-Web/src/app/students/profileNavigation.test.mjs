import assert from "node:assert/strict";
import test from "node:test";
import { studentDirectoryHref, studentProfileHref } from "./profileNavigation.mjs";

test("profile links use exact record IDs even when display identity is shared", () => {
  const query = "coordinator=ccs&sort=resume-desc";
  const first = studentProfileHref("student-record-a", query, "same@example.edu", 2);
  const second = studentProfileHref("student-record-b", query, "same@example.edu", 2);

  assert.notEqual(first, second);
  assert.equal(new URL(first, "https://admin.example").pathname, "/students/student-record-a");
  assert.equal(new URL(second, "https://admin.example").pathname, "/students/student-record-b");
  assert.equal(studentDirectoryHref(new URL(first, "https://admin.example").search),
    "/students?coordinator=ccs&sort=resume-desc&search=same%40example.edu&page=2");
});

test("return links keep directory state without accepting unrelated destinations", () => {
  assert.equal(studentDirectoryHref("next=https%3A%2F%2Fevil.example&program=BSIT&page=-1"),
    "/students?program=BSIT");
  assert.equal(studentDirectoryHref(""), "/students");
});
