import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "../../..");

test("Recording disclosure exists in PreSimulationBriefingScreen", () => {
  const file = path.join(mobileRoot, "src/screens/interview/PreSimulationBriefingScreen.tsx");
  const content = fs.readFileSync(file, "utf-8");
  assert.ok(content.includes("Recording Disclosure"), "Title must be present");
  assert.ok(
    content.includes("Your answers will be recorded so AIRIS can transcribe and evaluate your interview responses"),
    "Disclosure statement must be present"
  );
  assert.ok(
    content.includes("Your microphone is active only during the answer portion of the interview"),
    "Microphone behavior statement must be present"
  );
  assert.ok(
    content.includes("clearSession()"),
    "Exit button must clear active session"
  );
});

test("Recording disclosure exists in ImmersiveBriefingScreen", () => {
  const file = path.join(mobileRoot, "src/screens/interview/ImmersiveBriefingScreen.tsx");
  const content = fs.readFileSync(file, "utf-8");
  assert.ok(content.includes("Recording Disclosure"), "Title must be present");
  assert.ok(
    content.includes("Your answers will be recorded so AIRIS can transcribe and evaluate your interview responses"),
    "Disclosure statement must be present"
  );
  assert.ok(
    content.includes("Your microphone is active only during the answer portion of the interview"),
    "Microphone behavior statement must be present"
  );
  assert.ok(
    content.includes("clearSession()"),
    "Exit button must clear active session"
  );
});

test("interviewStore supports resetSessionForNewInterview with fresh sessionId", () => {
  const file = path.join(mobileRoot, "src/store/interviewStore.ts");
  const content = fs.readFileSync(file, "utf-8");
  assert.ok(
    content.includes("resetSessionForNewInterview: (interviewType: InterviewSession['interviewType']) => void"),
    "Interface must declare resetSessionForNewInterview"
  );
  assert.ok(
    content.includes("resetSessionForNewInterview: (interviewType) => set({"),
    "Store must implement resetSessionForNewInterview"
  );
  assert.ok(
    content.includes("currentQuestion: ''"),
    "Must reset currentQuestion to empty string"
  );
  assert.ok(
    content.includes("questionsAsked: 0"),
    "Must reset questionsAsked to 0"
  );
  assert.ok(
    content.includes("history: []"),
    "Must reset history to empty array"
  );
});

test("interview.tsx invokes resetSessionForNewInterview on starting interview", () => {
  const file = path.join(mobileRoot, "app/(student)/(tabs)/interview.tsx");
  const content = fs.readFileSync(file, "utf-8");
  assert.ok(
    content.includes("resetSessionForNewInterview(selectedType)"),
    "handleContinue must reset session with selected type"
  );
});

test("ImmersiveInterviewScreen has race-safe scene loading machine and attempt tracking", () => {
  const file = path.join(mobileRoot, "src/screens/interview/ImmersiveInterviewScreen.tsx");
  const content = fs.readFileSync(file, "utf-8");
  assert.ok(
    content.includes('type SceneLoadingState = "idle" | "loading" | "loaded" | "exiting"'),
    "Must define scene loading states without a recovery page"
  );
  assert.ok(
    content.includes("const [sceneLoadingState, setSceneLoadingState] = useState<SceneLoadingState>(\"idle\")"),
    "Must track sceneLoadingState"
  );
  assert.ok(
    content.includes("sceneLoadAttemptRef"),
    "Must track attempt ID to ignore stale callbacks"
  );
  assert.ok(
    content.includes("20000"),
    "Must use a 20s diagnostic timeout"
  );
  assert.ok(
    content.includes('postToUnity("PING")'),
    "Must probe the retained Unity player on attachment"
  );
  assert.ok(
    content.includes("activeSessionIdRef"),
    "Must bind activeSessionIdRef to isolate session"
  );
  assert.ok(
    content.includes("currentSession.sessionId !== activeSessionIdRef.current"),
    "Must discard messages if session ID differs"
  );
  assert.ok(
    content.includes("listeningSafetyTimerRef"),
    "Must have listening safety watchdog timer"
  );
  assert.ok(
    content.includes("65000"),
    "Listening recovery must allow Unity’s 60s recording maximum and handoff"
  );
});

test("Assembly-CSharp.cpp enforces calibrated noise floor <= 0.0035 and speech threshold <= 0.015", () => {
  const file = path.join(
    mobileRoot,
    "android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp"
  );
  const content = fs.readFileSync(file, "utf-8");
  assert.ok(
    content.includes("calculated_noise > 0.0035f"),
    "Must clamp ambient noise floor to 0.0035f maximum"
  );
  assert.ok(
    content.includes("L_35 < 0.006f"),
    "Must reject speech samples > 0.006f during ambient calibration"
  );
  assert.ok(
    content.includes("0.8f"),
    "Must shorten calibration time to 0.8s"
  );
});
