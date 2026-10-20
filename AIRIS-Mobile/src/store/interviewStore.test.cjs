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

test("an early completion response cannot complete an incomplete interview", () => {
  seedSession();
  useInterviewStore.getState().submitAnswer("Final answer.", { score: 90 }, undefined, undefined, undefined, true, false);
  const session = useInterviewStore.getState().session;
  assert.equal(useInterviewStore.getState().status, "briefing");
  assert.equal(session.history.length, 0);
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


test("Q9 is the ninth scored answer; Q10 closes once without accepting a tenth answer", () => {
  seedSession();
  for (let index = 1; index <= 8; index++) {
    useInterviewStore.getState().submitAnswer(`Synthetic answer ${index}`, { overall: 73 },
      index === 8 ? "Do you have any questions for us?" : `Core question ${index + 1}`,
      index === 8 ? "candidate_questions" : "behavioral", "Benchmark", false, false);
  }
  assert.equal(useInterviewStore.getState().session.questionsAsked, 9);
  useInterviewStore.getState().submitAnswer("What mentorship is available?", { overall: 71 },
    "Our session has concluded. Please wait while your results are prepared.", "closing", "", false, false);
  const before = useInterviewStore.getState().session;
  assert.equal(before.history.filter(turn => !turn.isInteraction).length, 9);
  assert.equal(before.evaluations.length, 9);
  assert.equal(before.questionsAsked, 10);
  useInterviewStore.getState().submitAnswer("Late background speech", { overall: 99 }, "Question eleven", "behavioral");
  assert.equal(useInterviewStore.getState().session, before);
  useInterviewStore.getState().completeClosing();
  const completed = useInterviewStore.getState().session;
  useInterviewStore.getState().completeClosing();
  assert.equal(useInterviewStore.getState().status, "evaluating");
  assert.equal(useInterviewStore.getState().session, completed);
  assert.equal(completed.finalReport, undefined);
  useInterviewStore.getState().setFinalReport({overallPerformance: 73});
  assert.equal(useInterviewStore.getState().status, "completed");
  assert.equal(completed.history.length, 9);
});

test("clarification interaction leaves the numbered topic and scoring count unchanged", () => {
  seedSession();
  useInterviewStore.getState().submitAnswer("Synthetic unrelated reply", null, "Please introduce yourself.", "follow-up", "Benchmark", false, true);
  assert.equal(useInterviewStore.getState().session.questionsAsked, 1);
  assert.equal(useInterviewStore.getState().session.evaluations.length, 0);
  useInterviewStore.getState().submitAnswer("Synthetic relevant answer", { overall: 73 }, "Why this role?", "motivation", "Benchmark", false, false);
  assert.equal(useInterviewStore.getState().session.questionsAsked, 2);
  assert.equal(useInterviewStore.getState().session.evaluations.length, 1);
});

test("unclear retries preserve the scored question, category and semantic benchmark", () => {
  seedSession();
  useInterviewStore.setState(state => ({session: {...state.session, currentBenchmarkAnswer: "Original benchmark"}}));
  useInterviewStore.getState().submitAnswer("Hello", null, "Please repeat yourself.", "interaction", undefined, false, true);
  let session = useInterviewStore.getState().session;
  assert.equal(session.currentQuestion, "Please repeat yourself.");
  assert.equal(session.currentQuestionType, "intro");
  assert.equal(session.currentBenchmarkAnswer, "Original benchmark");
  useInterviewStore.getState().submitAnswer("Another unclear reply", null, "Please explain further.", "follow-up", undefined, false, true);
  useInterviewStore.getState().submitAnswer("Synthetic complete introduction", {overall: 75}, "Why this role?", "motivation", "Next benchmark", false, false);
  session = useInterviewStore.getState().session;
  assert.equal(session.history.length, 3);
  assert.deepEqual(session.history[2], {question: "Tell me about yourself.", answer: "Synthetic complete introduction", questionType: "intro", benchmarkAnswer: "Original benchmark", isInteraction: false});
  assert.equal(session.evaluations.length, 1);
  assert.equal(session.questionsAsked, 2);
  assert.equal(session.currentBenchmarkAnswer, "Next benchmark");
});
