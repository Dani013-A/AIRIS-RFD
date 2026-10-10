import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const analytics = readFileSync(new URL("./dashboard/page.tsx", import.meta.url), "utf8");
const reports = readFileSync(new URL("./reports/page.tsx", import.meta.url), "utf8");

test("Institutional Analytics uses employment terminology in the requested milestone and Stage 6", () => {
  assert.match(analytics, /step: 6,[\s\S]*?sub: "Ready for Employment"/);
  assert.match(analytics, /Employability Preparation Milestones[\s\S]*?Ready for Employment/);
  assert.doesNotMatch(analytics, /Ready for OJT Placement|sub: "Ready for OJT"/);
});

test("Institutional Reports Suite description omits OJT Coordination", () => {
  assert.match(reports, /Institutional Reports Suite[\s\S]*?T\.I\.P\. Career Center official analytics\./);
  assert.doesNotMatch(reports, /T\.I\.P\. Career Center & OJT Coordination official analytics\./);
});
