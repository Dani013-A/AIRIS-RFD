import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { standardInterviewUiState } from "./standardInterviewUi.ts";

const base = { recording: false, transcribing: false, evaluating: false, error: null, answer: "" };

test("pulse appears only during actual recording", () => {
  assert.deepEqual(standardInterviewUiState(base), {
    phase: "idle", showPulse: false, label: "Tap the microphone to answer", canContinue: false,
  });
  assert.equal(standardInterviewUiState({ ...base, recording: true }).showPulse, true);
  assert.equal(standardInterviewUiState({ ...base, transcribing: true }).showPulse, false);
  assert.equal(standardInterviewUiState({ ...base, evaluating: true }).showPulse, false);
  assert.equal(standardInterviewUiState({ ...base, error: "Failed" }).phase, "error");
});

test("only a transcribed answer can continue while idle", () => {
  assert.equal(standardInterviewUiState({ ...base, answer: "A clear answer" }).canContinue, true);
  assert.equal(standardInterviewUiState({ ...base, answer: "  " }).canContinue, false);
  assert.equal(standardInterviewUiState({ ...base, answer: "A clear answer", recording: true }).canContinue, false);
  assert.equal(standardInterviewUiState({ ...base, answer: "A clear answer", evaluating: true }).canContinue, false);
  assert.doesNotMatch(readFileSync(new URL("./ActiveSimulationScreen.tsx", import.meta.url), "utf8"), /\bTextInput\b/);
});
