const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, path) => module._compile(
  ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText,
  path
);

// Minimal React stub: zustand requires react only for its react bindings entry.
const originalLoad = Module._load;
Module._load = function (id, parent, isMain) {
  if (id === "react") {
    return { useSyncExternalStore: () => {}, useRef: () => ({ current: null }), useEffect: () => {}, useState: (v) => [v, () => {}] };
  }
  return originalLoad(id, parent, isMain);
};

const { useInterviewStore } = require("./interviewStore.ts");

function seedSession() {
  useInterviewStore.getState().initializeSession({
    userId: "qa-user",
    targetRole: "Full Stack Developer",
    program: "BSIT",
    resumeId: "resume-1",
    interviewType: "one-on-one",
    totalQuestions: 10,
    firstQuestion: "Tell me about yourself.",
    firstQuestionType: "intro",
  });
}

test("first answer advances to question 2 exactly once", () => {
  seedSession();
  const before = useInterviewStore.getState().session;
  assert.equal(before.questionsAsked, 1);

  useInterviewStore.getState().submitAnswer(
    "My answer.",
    { score: 80 },
    "Why this role?",
    "motivation",
    undefined,
    false,
    false
  );

  const after = useInterviewStore.getState().session;
  assert.equal(after.questionsAsked, 2);
  assert.equal(after.currentQuestion, "Why this role?");
  assert.equal(after.history.length, 1);
  assert.equal(after.history[0].answer, "My answer.");
  assert.equal(after.history[0].question, "Tell me about yourself.");
});

test("final answer completes instead of advancing", () => {
  seedSession();
  useInterviewStore.getState().submitAnswer("Final answer.", { score: 90 }, undefined, undefined, undefined, true, false);
  const session = useInterviewStore.getState().session;
  assert.equal(useInterviewStore.getState().status, "completed");
  assert.equal(session.history.length, 1);
});

test("follow-up question does not increment questionsAsked index", () => {
  seedSession();
  const before = useInterviewStore.getState().session;
  assert.equal(before.questionsAsked, 1);

  useInterviewStore.getState().submitAnswer(
    "My brief answer.",
    { score: 60 },
    "Could you provide a specific example?",
    "follow-up",
    undefined,
    false,
    false
  );

  const after = useInterviewStore.getState().session;
  assert.equal(after.questionsAsked, 1, "questionsAsked must remain unchanged on follow-up");
  assert.equal(after.currentQuestionType, "follow-up");
  assert.equal(after.history.length, 1);
});

