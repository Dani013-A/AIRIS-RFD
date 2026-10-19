import assert from "node:assert/strict";
import test from "node:test";

/**
 * Model of the Unity RecordingManager silence & speech detection state machine
 * and RN duplicate completion guard, matching the native implementation in Assembly-CSharp.cpp
 * and ImmersiveInterviewScreen.tsx.
 */
class SilenceDetectionModel {
  constructor(options = {}) {
    this.silenceDuration = options.silenceDuration ?? 3.5;
    this.ambientNoiseFloor = options.ambientNoiseFloor ?? 0.003;
    this.maxRecordingDuration = options.maxRecordingDuration ?? 90.0;
    this.initialSilenceTimeout = options.initialSilenceTimeout ?? 10.0;

    // Dynamic thresholds clamped against ambient noise
    this.speechThreshold = Math.max(this.ambientNoiseFloor * 2.5 + 0.003, 0.007);
    this.silenceThreshold = Math.max(this.ambientNoiseFloor * 1.5 + 0.002, 0.0045);

    this.hasSpoken = false;
    this.currentSilenceTime = 0.0;
    this.recordingTime = 0.0;
    this.isRecording = true;
    this.stopReason = null;
  }

  tick(volume, deltaSeconds = 0.05) {
    if (!this.isRecording) return;
    this.recordingTime += deltaSeconds;

    if (this.recordingTime >= this.maxRecordingDuration) {
      this.isRecording = false;
      this.stopReason = "max_duration_reached";
      return;
    }

    if (!this.hasSpoken) {
      if (volume >= this.speechThreshold) {
        this.hasSpoken = true;
        this.currentSilenceTime = 0.0;
      } else if (this.recordingTime >= this.initialSilenceTimeout) {
        this.isRecording = false;
        this.stopReason = "initial_silence_timeout";
        return;
      }
      return;
    }

    // Speech has occurred
    if (volume >= this.speechThreshold) {
      // User is actively speaking: reset silence accumulator
      this.currentSilenceTime = 0.0;
    } else {
      // Volume is below speech threshold: accumulate silence
      this.currentSilenceTime += deltaSeconds;
      if (this.currentSilenceTime >= this.silenceDuration) {
        this.isRecording = false;
        this.stopReason = "silence_threshold_reached";
      }
    }
  }
}

/**
 * RN bridge answer completion guard model.
 */
class BridgeAnswerGuard {
  constructor() {
    this.isProcessingAnswer = false;
    this.processedCount = 0;
  }

  handleTranscriptReady(transcript) {
    if (this.isProcessingAnswer) {
      return false; // Ignored duplicate
    }
    this.isProcessingAnswer = true;
    this.processedCount += 1;
    return true; // Accepted
  }

  reset() {
    this.isProcessingAnswer = false;
  }
}

test("silence timer requires 3.5s continuous silence after speech", () => {
  const model = new SilenceDetectionModel({ silenceDuration: 3.5 });

  // 1. Initial silence before speech (2 seconds)
  for (let t = 0; t < 2.0; t += 0.05) {
    model.tick(0.002);
  }
  assert.equal(model.isRecording, true);
  assert.equal(model.hasSpoken, false);

  // 2. User starts speaking (volume = 0.05 for 3 seconds)
  for (let t = 0; t < 3.0; t += 0.05) {
    model.tick(0.05);
  }
  assert.equal(model.isRecording, true);
  assert.equal(model.hasSpoken, true);
  assert.equal(model.currentSilenceTime, 0.0);

  // 3. Silence begins: tick 3.0s of silence (less than 3.5s)
  for (let t = 0; t < 3.0; t += 0.05) {
    model.tick(0.002);
  }
  assert.equal(model.isRecording, true);
  assert.ok(model.currentSilenceTime >= 2.9 && model.currentSilenceTime <= 3.1);

  // 4. Another 0.5s of silence reaches 3.5s
  for (let t = 0; t < 0.5; t += 0.05) {
    model.tick(0.002);
  }
  assert.equal(model.isRecording, false);
  assert.equal(model.stopReason, "silence_threshold_reached");
});

test("resumed speech resets silence timer before 3.5s threshold", () => {
  const model = new SilenceDetectionModel({ silenceDuration: 3.5 });

  // User speaks
  model.tick(0.04);
  assert.equal(model.hasSpoken, true);

  // User pauses for 2.0s
  for (let t = 0; t < 2.0; t += 0.05) {
    model.tick(0.002);
  }
  assert.equal(model.isRecording, true);
  assert.ok(model.currentSilenceTime >= 1.9 && model.currentSilenceTime <= 2.1);

  // User resumes speech (volume spikes above speech threshold)
  model.tick(0.035);
  assert.equal(model.currentSilenceTime, 0.0);
  assert.equal(model.isRecording, true);

  // Another pause for 2.0s does not stop recording because timer was reset
  for (let t = 0; t < 2.0; t += 0.05) {
    model.tick(0.002);
  }
  assert.equal(model.isRecording, true);
  assert.ok(model.currentSilenceTime >= 1.9 && model.currentSilenceTime <= 2.1);
});

test("maximum recording duration prevents stuck listening state", () => {
  const model = new SilenceDetectionModel({ maxRecordingDuration: 90.0 });

  // Continuously speak without pausing for > 90s
  for (let t = 0; t < 91.0; t += 0.05) {
    model.tick(0.02);
  }
  assert.equal(model.isRecording, false);
  assert.equal(model.stopReason, "max_duration_reached");
});

test("bridge answer guard rejects duplicate completion events", () => {
  const guard = new BridgeAnswerGuard();

  const first = guard.handleTranscriptReady("My answer");
  assert.equal(first, true);
  assert.equal(guard.processedCount, 1);

  const duplicate = guard.handleTranscriptReady("My answer duplicate");
  assert.equal(duplicate, false);
  assert.equal(guard.processedCount, 1);

  // After session transition/reset, next answer can be processed
  guard.reset();
  const next = guard.handleTranscriptReady("Second answer");
  assert.equal(next, true);
  assert.equal(guard.processedCount, 2);
});
