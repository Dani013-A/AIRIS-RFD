import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const immersiveScreenSource = readFileSync(
  new URL("./ImmersiveInterviewScreen.tsx", import.meta.url),
  "utf8"
);
const assemblyCppSource = readFileSync(
  new URL("../../../android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp", import.meta.url),
  "utf8"
);

test("duplicate blue React Native overlay (processingBadge) is completely removed from ImmersiveInterviewScreen", () => {
  assert.doesNotMatch(immersiveScreenSource, /styles\.processingBadge/);
  assert.doesNotMatch(immersiveScreenSource, /Evaluating response\.\.\./);
  assert.doesNotMatch(immersiveScreenSource, /Analyzing Answer/);
});

test("immersive screen preserves connection loading overlay and exit controls without recovery UI", () => {
  assert.match(immersiveScreenSource, /styles\.overlay/);
  // Recovery controls were removed by the race-safe scene loading machine;
  // sceneLoadingRecovery.test.mjs owns that invariant.
  assert.doesNotMatch(immersiveScreenSource, /Retry Connection|handleRetryConnection/);
  assert.match(immersiveScreenSource, /Exit Interview/);
  assert.match(immersiveScreenSource, /handleStopInterview/);
});

test("scene loading request preserves selected interview mode (sceneName)", () => {
  assert.match(immersiveScreenSource, /postToUnity\("LOAD_SCENE",\s*\{\s*sceneName\s*\}\)/);
});

test("native Unity Assembly-CSharp does not disable listeningPanel in EnsureStopRecordingButton", () => {
  // Verify EnsureStopRecordingButton disables desk buttons without deactivating listeningPanel
  assert.doesNotMatch(
    assemblyCppSource,
    /GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92\(__this->___listeningPanel,\s*\(bool\)0/
  );
});

test("native Unity Assembly-CSharp enforces high contrast navy text and explicit Listening bubble text", () => {
  assert.match(assemblyCppSource, /Listening\.\.\. Speak your answer/);
  assert.match(assemblyCppSource, /ListeningBackground_VR/);
  assert.match(assemblyCppSource, /0\.12f,\s*0\.23f,\s*0\.37f/); // Navy text color
});

test("native Unity Assembly-CSharp enforces in-scene Processing bubble feedback when recording stops", () => {
  assert.match(assemblyCppSource, /Processing answer\.\.\./);
});

test("native Unity Assembly-CSharp disables in-world desk buttons to protect voice-first flow", () => {
  assert.match(assemblyCppSource, /All buttons hidden and disabled\. VR interaction is voice & silence driven\./);
  // ShowStartButton must set active to 0
  assert.match(
    assemblyCppSource,
    /GameObject_SetActive_m638E92E1E75E519E5B24CF150B08CA8E0CDFAB92\(L_2,\s*\(bool\)0,\s*NULL\);\s*\n\s*\}\s*\n\s*IL_001a:\s*\n\s*\{\s*\n\s*return;\s*\n\s*\}\s*\n\s*\}\s*\n\/\/ Method Definition Index: 71611/
  );
});
