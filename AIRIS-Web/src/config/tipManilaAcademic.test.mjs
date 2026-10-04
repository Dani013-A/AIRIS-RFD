import assert from "node:assert/strict";
import test from "node:test";
import { TIP_MANILA_COORDINATORS, getCoordinatorById, getProgramsForCoordinator, matchesCoordinator, matchesProgramChoice } from "./tipManilaAcademic.ts";

test("three coordinator groups cover all four colleges", () => {
  assert.deepEqual(TIP_MANILA_COORDINATORS.map((group) => group.id), ["ccs", "cea", "cbe-coa"]);
  assert.equal(matchesCoordinator("cbe-coa", "cbe"), true);
  assert.equal(matchesCoordinator("cbe-coa", "ca"), true);
  assert.equal(matchesCoordinator("cbe-coa", "ccs"), false);
});

test("legacy coordinator assignments remain readable", () => {
  assert.equal(getCoordinatorById("cbe")?.id, "cbe-coa");
  assert.equal(getCoordinatorById("ca")?.id, "cbe-coa");
  assert.equal(matchesCoordinator("cbe-coa", undefined, "ca"), true);
});

test("program options follow the canonical coordinator-to-college mapping", () => {
  assert.equal(getProgramsForCoordinator("all").length, 20);
  assert.equal(getProgramsForCoordinator("ccs").length, 4);
  assert.equal(getProgramsForCoordinator("cea").length, 8);
  assert.equal(getProgramsForCoordinator("cbe-coa").length, 8);
  assert.equal(getProgramsForCoordinator("cea").some((program) => program.name === "BS Information Technology"), false);
  assert.equal(matchesProgramChoice("BSIT", "BS Information Technology"), true);
});
