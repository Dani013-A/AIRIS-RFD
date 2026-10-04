import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./typographyScale.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { scaledFontSize, TEXT_SIZE_SCALE, normalizeTextSize } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

test("text size defaults can use the unchanged medium scale", () => {
  assert.equal(TEXT_SIZE_SCALE.medium, 1);
  assert.equal(scaledFontSize(16, "medium"), 16);
});

test("small and large apply consistently to text tokens", () => {
  assert.equal(scaledFontSize(16, "small"), 14);
  assert.equal(scaledFontSize(16, "large"), 19);
  assert.equal(scaledFontSize(24, "small"), 22);
  assert.equal(scaledFontSize(24, "large"), 29);
});

test("missing or malformed saved preference falls back to medium", () => {
  assert.equal(normalizeTextSize(undefined), "medium");
  assert.equal(normalizeTextSize("extra-large"), "medium");
  assert.equal(normalizeTextSize("small"), "small");
  assert.equal(normalizeTextSize("large"), "large");
});
