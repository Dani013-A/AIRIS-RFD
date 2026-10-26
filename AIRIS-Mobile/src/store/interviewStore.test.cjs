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
    sessionId: "a".repeat(32),
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
  useInterviewStore.getState().setFinalReport({overallPerformance:73,persisted:true,status:"completed",reportId:"a".repeat(32),sessionId:"a".repeat(32),completedAt:123});
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

test('revision-checked Q1 to Q3 commits once and rejects delayed duplicates', () => {
  seedSession();
  for (let number = 1; number <= 2; number++) {
    const before = useInterviewStore.getState().session;
    const expected = { sessionId: before.sessionId, historyLength: before.history.length };
    const submit = () => useInterviewStore.getState().submitAnswer(`Synthetic answer ${number}`, { overall: 73 }, `Q${number + 1}`, 'behavioral', '', false, false, expected);
    assert.equal(submit(), true);
    assert.equal(submit(), false);
    const after = useInterviewStore.getState().session;
    assert.equal(after.currentQuestion, `Q${number + 1}`);
    assert.equal(after.history.length, number);
    assert.equal(after.evaluations.length, number);
  }
});

test('invalid evaluation can be retried at the same revision without losing or advancing history', () => {
  seedSession();
  const before = useInterviewStore.getState().session;
  const expected = { sessionId: before.sessionId, historyLength: 0 };
  assert.equal(useInterviewStore.getState().submitAnswer('Retained synthetic answer', null, 'Q2', 'behavioral', '', false, false, expected), false);
  assert.equal(useInterviewStore.getState().session, before);
  assert.equal(useInterviewStore.getState().submitAnswer('Retained synthetic answer', {overall: 73}, 'Q2', 'behavioral', '', false, false, expected), true);
});

test('response from a previous mode or stopped session cannot change a new session', () => {
  seedSession();
  const previous = useInterviewStore.getState().session;
  useInterviewStore.getState().resetSessionForNewInterview('panel');
  const current = useInterviewStore.getState().session;
  assert.equal(useInterviewStore.getState().submitAnswer('Old answer', {overall: 73}, 'Old Q2', 'behavioral', '', false, false, {sessionId: previous.sessionId, historyLength: 0}), false);
  assert.equal(useInterviewStore.getState().session, current);
});

test('accepted audio telemetry survives into report history',()=>{
 seedSession();
 const metrics={totalPauseDuration:2,pauseCount:1,pausePeriodEquivalent:2,longestPause:2,averagePauseDuration:2};
 useInterviewStore.getState().submitAnswer('Synthetic spoken answer.',{overall:80},'Next question','goals','Reference',false,false,undefined,metrics);
 assert.deepEqual(useInterviewStore.getState().session.history[0].pauseMetrics,metrics);
});

test('cancellation invalidates closing, late answers and final reports',()=>{
 seedSession();
 const snapshot=useInterviewStore.getState().session;
 useInterviewStore.getState().clearSession();
 assert.equal(useInterviewStore.getState().submitAnswer('Late synthetic answer',{overall:80},undefined,undefined,undefined,false,false,{sessionId:snapshot.sessionId,historyLength:0}),false);
 useInterviewStore.getState().completeClosing();
 useInterviewStore.getState().setFinalReport({overallPerformance:80});
 assert.equal(useInterviewStore.getState().session,null);
 assert.equal(useInterviewStore.getState().status,'setup');
});

test('an evaluated local session cannot manufacture a completed report receipt',()=>{
 seedSession();
 for(let n=1;n<=9;n++)useInterviewStore.getState().submitAnswer('Synthetic answer',{overall:73},n===9?'Closing':`Q${n+1}`,n===9?'closing':'behavioral');
 useInterviewStore.getState().completeClosing();
 for(const receipt of [{overallPerformance:73},{overallPerformance:73,persisted:true,completedAt:123}]){
  useInterviewStore.getState().setFinalReport(receipt);
  assert.equal(useInterviewStore.getState().status,'evaluating');
  assert.equal(useInterviewStore.getState().session.finalReport,undefined);
 }
});
