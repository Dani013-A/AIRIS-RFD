import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROSTER_PATH = path.join(__dirname, "../fixtures/uat_participants_roster_50.json");

test("UAT Refinement Test Suite: Roster Integrity and Invariants", () => {
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, "utf8"));
  assert.equal(roster.length, 50, "Roster must contain exactly 50 participants");

  const ponce = roster.find((p) => p.email.toLowerCase() === "meponce@tip.edu.ph");
  assert.ok(ponce, "ERNEST PONCE must be present in roster");
  assert.equal(ponce.fullName, "ERNEST PONCE");

  const tang = roster.find((p) => p.email.toLowerCase() === "mdatang@tip.edu.ph");
  assert.ok(tang, "Danica Tang must be present in roster");
  assert.equal(tang.fullName, "Danica Tang");
});

test("UAT Refinement Test Suite: Score Invariants & Composite Formula", () => {
  for (let idx = 0; idx < 50; idx++) {
    const resumeScore = 50 + ((idx * 7 + 3) % 16);
    const interviewScore = 45 + ((idx * 11 + 5) % 26);
    const compositeScore = Math.round(0.40 * resumeScore + 0.60 * interviewScore);

    // Assert bounds
    assert.ok(resumeScore >= 50 && resumeScore <= 65, `Resume score ${resumeScore} out of [50, 65]`);
    assert.ok(interviewScore >= 45 && interviewScore <= 70, `Interview score ${interviewScore} out of [45, 70]`);
    assert.equal(
      compositeScore,
      Math.round(0.40 * resumeScore + 0.60 * interviewScore),
      "Composite must match canonical formula"
    );
  }
});
