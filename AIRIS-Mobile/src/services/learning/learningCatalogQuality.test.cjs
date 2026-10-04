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

const { VERIFIED_LEARNING_CATALOG } = require("../../data/verifiedLearningCatalog.ts");
const { validateAndSanitizeCatalog } = require("./catalogValidator.ts");
const audit = require("../../../../URL_VERIFICATION_REPORT.json");

test("audited 404 links are inactive and verified additions pass catalog validation", () => {
  const { validResources } = validateAndSanitizeCatalog(VERIFIED_LEARNING_CATALOG, []);
  const activeIds = new Set(validResources.map((resource) => resource.id));
  const audited404 = audit.catalog_resource_evidence.filter((resource) => resource.FINAL_STATUS === "DEAD_RESOURCE");
  assert.equal(audited404.length, 24);
  for (const resource of audited404) assert.equal(activeIds.has(resource.id), false, resource.id);
  for (const id of [
    "book_fpp_forecasting", "cert_oracle_java_programmer", "cert_gcp_associate_cloud_engineer",
    "cert_hashicorp_terraform_associate", "cert_cisco_ccna", "cert_cisco_ccst_networking",
    "course_ms_learn_active_directory_admin", "practice_linux_journey_interactive",
    "cert_solidworks_cswa_01", "cert_lean_six_sigma_green_belt_01",
    "practice_social_media_ad_campaign_lab_01", "cert_autodesk_cad_certified_user_01",
    "practice_investopedia_dcf_guide_01",
  ]) assert.equal(activeIds.has(id), false, id);
  for (const id of [
    "guide_openstax_business_statistics_2026",
    "guide_who_psychological_first_aid_2026",
    "tutorial_autodesk_revit_essential_skills_2026",
  ]) assert.equal(activeIds.has(id), true, id);
  assert.equal(new Set(VERIFIED_LEARNING_CATALOG.map((resource) => resource.id)).size, VERIFIED_LEARNING_CATALOG.length);
  assert.equal(validResources.some((resource) => resource.thumbnailUrl?.startsWith("https://images.unsplash.com/")), false);
});
