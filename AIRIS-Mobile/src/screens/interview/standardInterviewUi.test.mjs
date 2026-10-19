import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./standardInterviewUi.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { standardInterviewUiState, resolveSubmissionOutcome } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

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

test("answered first question keeps Next enabled while idle, even with a shown error", () => {
  assert.equal(standardInterviewUiState({ ...base, answer: "My answer", error: "No speech was detected." }).canContinue, true);
  assert.equal(standardInterviewUiState({ ...base, answer: "My answer", transcribing: true }).canContinue, false);
});

test("submission outcome advances exactly once with the next question", () => {
  const outcome = resolveSubmissionOutcome({
    isComplete: false,
    nextQuestion: { question: "Tell me about yourself.", questionType: "intro" },
  });
  assert.equal(outcome.kind, "advance");
  assert.equal(outcome.question, "Tell me about yourself.");
});

test("submission outcome completes on the final question", () => {
  assert.equal(resolveSubmissionOutcome({ isComplete: true }).kind, "complete");
});

test("submission without a next question is a visible retry, never a silent advance", () => {
  for (const response of [
    { isComplete: false },
    { isComplete: false, nextQuestion: null },
    { isComplete: false, nextQuestion: { question: "   " } },
  ]) {
    const outcome = resolveSubmissionOutcome(response);
    assert.equal(outcome.kind, "retry");
    assert.match(outcome.error, /next question/i);
  }
});

test("standard screen status pill reflects real capture state, never a false recording claim", () => {
  const activeSrc = readFileSync(new URL("./ActiveSimulationScreen.tsx", import.meta.url), "utf8");
  assert.match(activeSrc, /CaptureStatusPill/);
  // Listening status is gated on the real recording phase, not on screen presence.
  assert.match(activeSrc, /ui\.phase === "recording"[\s\S]*\? "listening"/);
  assert.match(activeSrc, /ui\.phase === "processing"[\s\S]*\? "processing"/);
  // No hardcoded always-on recording label.
  assert.doesNotMatch(activeSrc, />(Recording|Listening)[.…]*</);
});
