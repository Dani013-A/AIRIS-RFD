import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const cpp = fs.readFileSync(path.join(mobileRoot, "android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp"), "utf8");
const patch = fs.readFileSync(path.join(mobileRoot, "android/patch_assembly.py"), "utf8");

function recordingStep(state, rms, peak, panel = true) {
  if (state.stopped) return;
  state.smoothed += (rms - state.smoothed) * 0.35;
  const onset = panel ? state.smoothed > 0.004 : state.smoothed > 0.004 || peak > 0.0064;
  const active = state.spoken
    ? (panel ? state.smoothed > 0.0025 : state.smoothed > 0.0025 || peak > 0.00325 || rms > 0.003)
    : onset;
  if (active) {
    state.spoken = true;
    state.silence = 0;
  } else if (state.spoken) {
    state.silence += 0.1;
    if (state.silence >= 3.5) {
      state.stopped = true;
      state.stops++;
    }
  }
}

test("generated Panel code uses 3.5 seconds and ignores isolated hold peaks", () => {
  const start = cpp.lastIndexOf("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void RecordingManager_StartRecording_m");
  const end = cpp.indexOf("// Method Definition Index:", start);
  const body = cpp.slice(start, end);
  assert.match(body, /silenceDuration = \(3\.5f\)/);
  assert.doesNotMatch(body, /silenceDuration = IsOneOnOneScene\(\) \? \(3\.5f\) : \(5\.0f\)/);
  assert.match(cpp, /isVoiceActive = IsOneOnOneScene\(\) \? \(\(V_1->___smoothedVolume > V_7\)/);
  assert.match(cpp, /: \(V_1->___smoothedVolume > V_7\);/);
  assert.match(cpp, /: \(V_1->___smoothedVolume > V_6\);/);
  assert.match(patch, /Panel voice hold ignores isolated peaks/);
});

test("Panel no-speech stop releases mic and returns before WAV or transcript handoff", () => {
  const start = cpp.lastIndexOf("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void U3CStopRecordingU3Ed__31_MoveNext_m");
  const end = cpp.indexOf("// Method Definition Index:", start);
  const body = cpp.slice(start, end);
  const release = body.indexOf("RecordingManager_set_IsRecording_mFFEFEC00C28CB916C03F6DD815C17AADE7D188A7_inline(L_16, (bool)0");
  const guard = body.indexOf("if (!V_1->___speechDetected)");
  const handoff = body.indexOf("RecordingManager_SaveAndUploadRecording_m6D1D5A132D369F1EECDA9B05AE1ACD234807AF62(L_78");
  assert.ok(release >= 0 && release < guard && guard < handoff);
  assert.match(body.slice(guard, handoff), /UaaLBridge_SendToRN_mFA9CA93D96956F051F0657CC57855F6C997592A1\(bridge, il2cpp_string_new\("NO_SPEECH"\), WithAirisCaptureId\(il2cpp_string_new\("\{\}"\)\), NULL\)/);
  assert.match(body.slice(guard, handoff), /goto IL_0369;/);
  assert.match(patch, /Panel no-speech handoff guard/);
});

test("Panel noise peaks before speech cannot start an answer", () => {
  const s = { spoken: false, smoothed: 0, silence: 0, stopped: false, stops: 0 };
  for (let i = 0; i < 60; i++) recordingStep(s, 0.0008, i % 8 === 0 ? 0.009 : 0.0027);
  assert.equal(s.spoken, false);
  assert.equal(s.stopped, false);
});

test("Panel speech, short pause, renewed speech, and noisy silence complete once", () => {
  const s = { spoken: false, smoothed: 0, silence: 0, stopped: false, stops: 0 };
  for (let i = 0; i < 20; i++) recordingStep(s, 0.001, 0.002);
  assert.equal(s.spoken, false);
  for (let i = 0; i < 25; i++) recordingStep(s, 0.02, 0.05);
  assert.equal(s.spoken, true);
  for (let i = 0; i < 20; i++) recordingStep(s, 0.0008, i % 5 === 0 ? 0.007 : 0.0027);
  assert.equal(s.stopped, false);
  for (let i = 0; i < 10; i++) recordingStep(s, 0.02, 0.05);
  assert.equal(s.silence, 0);
  for (let i = 0; i < 55; i++) recordingStep(s, 0.0008, i % 5 === 0 ? 0.007 : 0.0027);
  assert.equal(s.stopped, true);
  assert.equal(s.stops, 1);
  recordingStep(s, 0.0008, 0.0027);
  assert.equal(s.stops, 1);
});
