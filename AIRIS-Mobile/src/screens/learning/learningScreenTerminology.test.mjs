import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const learningScreen = readFileSync(new URL("./LearningScreen.tsx", import.meta.url), "utf8");
const uploadScreen = readFileSync(new URL("../onboarding/ResumeUploadIntroScreen.tsx", import.meta.url), "utf8");
const templateUtil = readFileSync(new URL("../../utils/airisResumeTemplate.ts", import.meta.url), "utf8");

test("Knowledge Hub resume writing section displays T.I.P. Standard Resume", () => {
  assert.match(learningScreen, /name:\s*"T\.I\.P\. Standard Resume"/);
  assert.doesNotMatch(learningScreen, /name:\s*"AIRIS Standard Resume"/);
});

test("Resume upload screen uses T.I.P. Standard Resume Template", () => {
  assert.match(uploadScreen, /Download T\.I\.P\. Standard Resume Template/);
  assert.match(uploadScreen, /use the T\.I\.P\. standard template/);
  assert.doesNotMatch(uploadScreen, /Download AIRIS Standard Resume Template/);
  assert.doesNotMatch(uploadScreen, /use the AIRIS standard template/);
});

test("Resume template download utility uses T.I.P. Standard Resume Template", () => {
  assert.match(templateUtil, /"T\.I\.P\. Standard Resume Template"/);
  assert.doesNotMatch(templateUtil, /"AIRIS Standard Resume Template"/);
});
