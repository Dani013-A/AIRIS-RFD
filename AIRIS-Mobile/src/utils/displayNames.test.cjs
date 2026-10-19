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

const { formatSkillDisplayName, formatSectionDisplayName, fixConcatenatedSectionNames } = require("./displayNames.ts");

test("skill names restore known technical casing", () => {
  assert.equal(formatSkillDisplayName("CSs"), "CSS");
  assert.equal(formatSkillDisplayName("css"), "CSS");
  assert.equal(formatSkillDisplayName("CSS"), "CSS");
  assert.equal(formatSkillDisplayName("html"), "HTML");
  assert.equal(formatSkillDisplayName("javascript"), "JavaScript");
  assert.equal(formatSkillDisplayName("typescript"), "TypeScript");
  assert.equal(formatSkillDisplayName("react native"), "React Native");
  assert.equal(formatSkillDisplayName("nodejs"), "Node.js");
  assert.equal(formatSkillDisplayName("node"), "Node.js");
  assert.equal(formatSkillDisplayName("fastapi"), "FastAPI");
  assert.equal(formatSkillDisplayName("git"), "Git");
  assert.equal(formatSkillDisplayName("  Git  "), "Git");
});

test("skill names leave unknown text untouched", () => {
  assert.equal(formatSkillDisplayName("Team Collaboration"), "Team Collaboration");
  assert.equal(formatSkillDisplayName("Agile Project Management"), "Agile Project Management");
  assert.equal(formatSkillDisplayName("TypeScript (ES6+)"), "TypeScript (ES6+)");
  assert.equal(formatSkillDisplayName(""), "");
  assert.equal(formatSkillDisplayName(null), "");
});

test("section names split concatenation and normalize", () => {
  assert.equal(formatSectionDisplayName("ContactInformation"), "Contact Information");
  assert.equal(formatSectionDisplayName("Workexperience"), "Work Experience");
  assert.equal(formatSectionDisplayName("WorkExperience"), "Work Experience");
  assert.equal(formatSectionDisplayName("ProfessionalSummary"), "Professional Summary");
  assert.equal(formatSectionDisplayName("RelevantCoursework"), "Relevant Coursework");
  assert.equal(formatSectionDisplayName("OrganizationsLeadership"), "Organizations & Leadership");
  assert.equal(formatSectionDisplayName("Education"), "Education");
  assert.equal(formatSectionDisplayName("Skills"), "Skills");
});

test("section names pass through ordinary labels", () => {
  assert.equal(formatSectionDisplayName("Content"), "Content");
  assert.equal(formatSectionDisplayName(""), "");
});

test("inline section keys are fixed inside longer text", () => {
  assert.equal(
    fixConcatenatedSectionNames("Add Standard Contactinformation Heading"),
    "Add Standard Contact Information Heading"
  );
  assert.equal(
    fixConcatenatedSectionNames("Add Standard Workexperience Heading"),
    "Add Standard Work Experience Heading"
  );
  assert.equal(
    fixConcatenatedSectionNames("Use standard heading: ContactInformation."),
    "Use standard heading: Contact Information."
  );
  assert.equal(
    fixConcatenatedSectionNames("Include Standard Date Ranges"),
    "Include Standard Date Ranges"
  );
});
