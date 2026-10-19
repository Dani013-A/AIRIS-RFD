const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, path) => module._compile(
  ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText,
  path
);

const { groupGuidanceItems } = require("./groupGuidance.ts");

const SHARED_CHUNK = "Proficient in CSS, Git, Node.js, and React.";

test("groups skills sharing the same verbatim evidence", () => {
  const groups = groupGuidanceItems(
    ["CSS", "Git", "Node.js", "React"].map((competency) => ({
      competency,
      headline: "STRONG POINT",
      description: "Your resume demonstrates solid evidence for this target role competency.",
      actionRecommendation: "Keep this evidence detailed and prominent in your portfolio.",
      matchedChunk: SHARED_CHUNK,
    }))
  );
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].skills, ["CSS", "Git", "Node.js", "React"]);
  assert.equal(groups[0].evidence, SHARED_CHUNK);
  assert.equal(groups[0].sharedMeaning, "Your resume demonstrates solid evidence for this target role competency.");
  assert.equal(groups[0].sharedAction, "Keep this evidence detailed and prominent in your portfolio.");
  assert.equal(groups[0].meaningBySkill, null);
  assert.equal(groups[0].actionBySkill, null);
});

test("does not merge different evidence or recommendations", () => {
  const groups = groupGuidanceItems([
    {
      competency: "CSS",
      headline: "STRONG POINT",
      description: "Desc A",
      actionRecommendation: "Action A",
      matchedChunk: "Chunk one.",
    },
    {
      competency: "Python",
      headline: "STRONG POINT",
      description: "Desc B",
      actionRecommendation: "Action B",
      matchedChunk: "Chunk two.",
    },
  ]);
  assert.equal(groups.length, 2);
});

test("keeps per-skill text when shared evidence has different meanings", () => {
  const groups = groupGuidanceItems([
    {
      competency: "CSS",
      headline: "STRONG POINT",
      description: "Direct evidence for CSS.",
      actionRecommendation: "Same action.",
      matchedChunk: SHARED_CHUNK,
    },
    {
      competency: "React",
      headline: "STRONG POINT",
      description: "Direct evidence for React.",
      actionRecommendation: "Same action.",
      matchedChunk: "  Proficient in CSS, Git, Node.js, and React. ",
    },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].evidence, SHARED_CHUNK);
  assert.equal(groups[0].sharedMeaning, null);
  assert.equal(groups[0].meaningBySkill.length, 2);
  assert.equal(groups[0].sharedAction, "Same action.");
});

test("items without evidence group by headline only when identical", () => {
  const groups = groupGuidanceItems([
    {
      competency: "Docker",
      headline: "WEAK POINT / GAP",
      description: "Same desc.",
      actionRecommendation: "Same action.",
      matchedChunk: null,
    },
    {
      competency: "AWS",
      headline: "WEAK POINT / GAP",
      description: "Same desc.",
      actionRecommendation: "Same action.",
      matchedChunk: undefined,
    },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].evidence, null);
});
