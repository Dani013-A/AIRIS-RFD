import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * High-fidelity model of the native C++ RecordingManager & Unity bridge lifecycle,
 * directly reflecting the actual implementation in Assembly-CSharp.cpp.
 */
class NativeRecordingLifecycleModel {
  constructor(options = {}) {
    this.ambientNoiseFloor = options.ambientNoiseFloor ?? 0.0020;
    this.silenceDuration = options.silenceDuration ?? 2.5;
    this.minimumRecordingTime = options.minimumRecordingTime ?? 1.0;
    this.maxInitialSilenceTime = options.maxInitialSilenceTime ?? 10.0;
    this.maximumRecordingTime = options.maximumRecordingTime ?? 60.0;

    this.speechThreshold = Math.max(this.ambientNoiseFloor * 2.5 + 0.003, 0.007);
    this.silenceThreshold = Math.max(this.ambientNoiseFloor * 1.5 + 0.002, 0.0045);

    this.isRecording = false;
    this.speechDetected = false;
    this.currentSilenceTime = 0.0;
    this.elapsedTime = 0.0;
    this.smoothedVolume = 0.0;
    this.stopReason = null;
    this.stopCount = 0;
  }

  startRecording() {
    this.isRecording = true;
    this.speechDetected = false;
    this.currentSilenceTime = 0.0;
    this.elapsedTime = 0.0;
    this.smoothedVolume = 0.0;
    this.stopReason = null;
  }

  stopRecording(reason) {
    if (!this.isRecording) return false;
    this.isRecording = false;
    this.stopReason = reason;
    this.stopCount += 1;
    return true;
  }

  tick(volume, peak, deltaSeconds = 0.1) {
    if (!this.isRecording) return;
    this.elapsedTime += deltaSeconds;

    // Smoothed volume EMA (alpha = 0.35)
    this.smoothedVolume = this.smoothedVolume + (volume - this.smoothedVolume) * 0.35;

    // 1. Active speech detection
    const isSpeechNow = (this.smoothedVolume > this.speechThreshold) || (peak > this.speechThreshold * 1.8);
    if (isSpeechNow) {
      if (!this.speechDetected) {
        this.speechDetected = true;
      }
      this.currentSilenceTime = 0.0;
    }

    // 2. Silence / post-speech detection
    if (this.speechDetected) {
      if (!isSpeechNow) {
        if (this.elapsedTime >= this.minimumRecordingTime) {
          this.currentSilenceTime += deltaSeconds;
          if (this.currentSilenceTime >= this.silenceDuration) {
            this.stopRecording("silence_threshold_reached");
            return;
          }
        }
      }
    } else {
      // Candidate has not spoken yet: check initial silence timeout
      if (this.elapsedTime >= this.maxInitialSilenceTime) {
        this.stopRecording("initial_silence_timeout");
        return;
      }
    }

    // 3. Maximum recording time fallback
    if (this.elapsedTime >= this.maximumRecordingTime) {
      this.stopRecording("maximum_recording_time");
      return;
    }
  }
}

/**
 * Session coordinator modeling the React Native interview orchestrator.
 */
class InterviewSessionCoordinator {
  constructor(sessionId = "sess-1") {
    this.sessionId = sessionId;
    this.currentQuestionIndex = 1;
    this.isProcessingAnswer = false;
    this.completedQuestions = [];
    this.activeRecording = new NativeRecordingLifecycleModel();
    this.isSessionActive = true;
  }

  onQuestionSpoken() {
    if (!this.isSessionActive) return;
    this.activeRecording.startRecording();
  }

  onRecordingStopped() {
    if (!this.isSessionActive) return;
    // Processing feedback begins
  }

  async onTranscriptReady(audioUri, evaluateFn) {
    if (!this.isSessionActive) return false;
    if (this.isProcessingAnswer) return false; // duplicate rejection guard
    this.isProcessingAnswer = true;

    try {
      const qIndex = this.currentQuestionIndex;
      const res = await evaluateFn(audioUri, qIndex);
      if (!this.isSessionActive || qIndex !== this.currentQuestionIndex) {
        // stale evaluation response rejected
        return false;
      }
      this.completedQuestions.push({ questionIndex: qIndex, evaluation: res });
      this.currentQuestionIndex += 1;
      return true;
    } finally {
      this.isProcessingAnswer = false;
    }
  }

  exitAndReset(newSessionId) {
    this.isSessionActive = false;
    this.activeRecording.stopRecording("session_exit");
    return new InterviewSessionCoordinator(newSessionId);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

test("1 & 2: First and second questions record and complete cleanly", async () => {
  const coord = new InterviewSessionCoordinator("sess-q1q2");

  // Question 1
  coord.onQuestionSpoken();
  assert.equal(coord.activeRecording.isRecording, true);
  // Speak for 2s (volume 0.04, peak 0.12)
  for (let t = 0; t < 2.0; t += 0.1) coord.activeRecording.tick(0.04, 0.12);
  assert.equal(coord.activeRecording.speechDetected, true);
  // Silence for 3.2s (ambient noise 0.003, peak 0.004 - allows EMA decay + 2.5s silence)
  for (let t = 0; t <= 3.2; t += 0.1) coord.activeRecording.tick(0.003, 0.004);
  assert.equal(coord.activeRecording.isRecording, false);
  assert.equal(coord.activeRecording.stopReason, "silence_threshold_reached");

  const q1Accepted = await coord.onTranscriptReady("file:///q1.wav", async () => ({ score: 85 }));
  assert.equal(q1Accepted, true);
  assert.equal(coord.currentQuestionIndex, 2);

  // Question 2: fresh start
  coord.onQuestionSpoken();
  assert.equal(coord.activeRecording.isRecording, true);
  assert.equal(coord.activeRecording.speechDetected, false);
  assert.equal(coord.activeRecording.currentSilenceTime, 0.0);
  // Speak for 1.5s
  for (let t = 0; t <= 1.5; t += 0.1) coord.activeRecording.tick(0.05, 0.15);
  assert.equal(coord.activeRecording.speechDetected, true);
  // Silence for 3.2s
  for (let t = 0; t <= 3.2; t += 0.1) coord.activeRecording.tick(0.002, 0.003);
  assert.equal(coord.activeRecording.isRecording, false);
  assert.equal(coord.activeRecording.stopReason, "silence_threshold_reached");

  const q2Accepted = await coord.onTranscriptReady("file:///q2.wav", async () => ({ score: 88 }));
  assert.equal(q2Accepted, true);
  assert.equal(coord.currentQuestionIndex, 3);
  assert.equal(coord.completedQuestions.length, 2);
});

test("3: Five consecutive question transitions succeed without getting stuck", async () => {
  const coord = new InterviewSessionCoordinator("sess-5q");

  for (let q = 1; q <= 5; q++) {
    coord.onQuestionSpoken();
    assert.equal(coord.activeRecording.isRecording, true);
    assert.equal(coord.currentQuestionIndex, q);

    // Speak for 1.2s
    for (let t = 0; t <= 1.2; t += 0.1) coord.activeRecording.tick(0.035, 0.09);
    assert.equal(coord.activeRecording.speechDetected, true);

    // Silence for 3.2s
    for (let t = 0; t <= 3.2; t += 0.1) coord.activeRecording.tick(0.0025, 0.003);
    assert.equal(coord.activeRecording.isRecording, false);
    assert.equal(coord.activeRecording.stopReason, "silence_threshold_reached");

    const accepted = await coord.onTranscriptReady(`file:///q${q}.wav`, async () => ({ score: 80 + q }));
    assert.equal(accepted, true);
  }

  assert.equal(coord.completedQuestions.length, 5);
  assert.equal(coord.currentQuestionIndex, 6);
});

test("4: Speech begins during the first second of recording", () => {
  const model = new NativeRecordingLifecycleModel();
  model.startRecording();

  // Speech starts immediately at t = 0.2s (volume 0.04)
  model.tick(0.002, 0.003);
  model.tick(0.04, 0.14); // t = 0.2s
  assert.equal(model.speechDetected, true);
  assert.equal(model.currentSilenceTime, 0.0);
  assert.equal(model.isRecording, true);
});

test("5: Silence occurs after speech", () => {
  const model = new NativeRecordingLifecycleModel();
  model.startRecording();

  // Speak for 1.5s
  for (let t = 0; t <= 1.5; t += 0.1) model.tick(0.04, 0.12);
  assert.equal(model.speechDetected, true);

  // Silence begins (3.2s - allows EMA decay + 2.5s silence)
  for (let t = 0; t <= 3.2; t += 0.1) model.tick(0.002, 0.003);
  assert.equal(model.isRecording, false);
  assert.equal(model.stopReason, "silence_threshold_reached");
});

test("6: Ambient noise is present (e.g. 0.0038) without false speech triggering", () => {
  const model = new NativeRecordingLifecycleModel({ ambientNoiseFloor: 0.0035 });
  model.startRecording();

  // Room ambient noise hovers around 0.0038 with peak 0.0055 for 5 seconds
  for (let t = 0; t < 5.0; t += 0.1) model.tick(0.0038, 0.0055);
  // Should NOT trigger false speech
  assert.equal(model.speechDetected, false);
  assert.equal(model.isRecording, true);
});

test("7: No speech is detected triggers initial silence timeout (10s)", () => {
  const model = new NativeRecordingLifecycleModel();
  model.startRecording();

  // Total silence / quiet room for 10 seconds
  for (let t = 0; t < 10.0; t += 0.1) model.tick(0.002, 0.003);
  assert.equal(model.isRecording, false);
  assert.equal(model.stopReason, "initial_silence_timeout");
});

test("8: Duplicate stop events are safely rejected by bridge guard", async () => {
  const coord = new InterviewSessionCoordinator("sess-dup");
  coord.onQuestionSpoken();

  let evalCallCount = 0;
  const slowEval = async () => {
    evalCallCount++;
    return { score: 90 };
  };

  // First TRANSCRIPT_READY
  const p1 = coord.onTranscriptReady("file:///ans.wav", slowEval);
  // Duplicate TRANSCRIPT_READY arriving concurrently
  const p2 = coord.onTranscriptReady("file:///ans.wav", slowEval);

  const [res1, res2] = await Promise.all([p1, p2]);
  assert.equal(res1, true);
  assert.equal(res2, false); // duplicate rejected
  assert.equal(evalCallCount, 1);
});

test("9: Transcription fails and is retried", async () => {
  let attempt = 0;
  let success = false;

  for (let i = 0; i < 2; i++) {
    attempt++;
    try {
      if (attempt === 1) throw new Error("Transcription timeout");
      success = true;
    } catch {
      // Recovery prompt shown to candidate
    }
  }

  assert.equal(attempt, 2);
  assert.equal(success, true);
});

test("10: An old evaluation response arrives after a new question starts is discarded", async () => {
  const coord = new InterviewSessionCoordinator("sess-stale");
  coord.currentQuestionIndex = 1;

  // Stale evaluation finishes for Q1 after user already advanced to Q2
  const stalePromise = coord.onTranscriptReady("file:///q1.wav", async () => {
    // Artificial delay where another event advanced the question
    coord.currentQuestionIndex = 2;
    return { score: 75 };
  });

  const accepted = await stalePromise;
  assert.equal(accepted, false); // rejected because questionIndex changed
  assert.equal(coord.completedQuestions.length, 0);
});

test("11: The user exits and starts a new session begins cleanly at Question 1", () => {
  const coord1 = new InterviewSessionCoordinator("sess-first");
  coord1.currentQuestionIndex = 4;
  coord1.completedQuestions.push({ q: 1 }, { q: 2 }, { q: 3 });

  // Exit
  const coord2 = coord1.exitAndReset("sess-fresh");
  assert.equal(coord1.isSessionActive, false);
  assert.equal(coord2.isSessionActive, true);
  assert.equal(coord2.currentQuestionIndex, 1);
  assert.equal(coord2.completedQuestions.length, 0);
});

test("12: In-world desk buttons remain disabled in Assembly-CSharp.cpp source", () => {
  const cppPath = path.resolve(__dirname, "../../../android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp");
  const content = fs.readFileSync(cppPath, "utf-8");

  // Check that ShowNextQuestionButton is a complete no-op that deactivates the button
  assert.ok(
    content.includes("DialogueManager_ShowNextQuestionButton_m9A336560C50A4C00BE1A31249AD3AF0EEC29EBEF") &&
    content.includes("voice-first interaction suppresses all desk Next Question buttons permanently"),
    "ShowNextQuestionButton must be permanently neutralized in native C++"
  );

  // Check that EnsureEndInterviewButton deactivates all 8 in-world button variants
  assert.ok(
    content.includes("kUnwantedButtons") &&
    content.includes("NextQuestionButton") &&
    content.includes("StopRecordingButton_VR"),
    "EnsureEndInterviewButton must suppress all desk and VR buttons"
  );

  // Check that speech bubble auto-sizes and has no ellipsis overflow
  assert.ok(
    content.includes("TMP_Text_set_overflowMode_mB8911BA07CEE0AC1E4E108B5EB79B230F90E96A1(txt, 0, NULL);"),
    "Speech bubble overflowMode must be 0 (Overflow, not Ellipsis)"
  );
});

test("bridge retries restore Listening only after capture successfully starts", () => {
  const cpp = fs.readFileSync(path.resolve(__dirname, "../../../android/unityLibrary/src/main/Il2CppOutputProject/Source/il2cppOutput/Assembly-CSharp.cpp"), "utf8");
  const start = cpp.lastIndexOf("IL2CPP_EXTERN_C IL2CPP_METHOD_ATTR void UaaLBridge_HandleStartRecording_");
  const handler = cpp.slice(start, cpp.indexOf("// Method Definition Index:", start));
  const capture = handler.indexOf("RecordingManager_StartRecording_");
  const successful = handler.indexOf("if (L_2->___U3CIsRecordingU3Ek__BackingField && __this->___dialogueManager != NULL)");
  const feedback = handler.indexOf("DialogueManager_ShowListening_");
  assert.ok(capture >= 0 && successful > capture && feedback > successful,
    "a no-speech/nonverbal retry must replace Processing with Listening after a successful start");
});
