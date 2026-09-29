import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  NativeSyntheticEvent,
  StatusBar,
  BackHandler,
} from "react-native";
import UnityView from "@azesmway/react-native-unity";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";
import AirisOrientation from "../../utils/AirisOrientation";

// ── Daniel's existing scoring pipeline & transcription ─────────────────────
import {
  submitInterviewAnswer,
  transcribeAudio,
  PauseMetrics,
} from "../../services/api/interviewApi";

// ── Bridge types ────────────────────────────────────────────────────────────
interface BridgeEnvelope {
  type: string;
  payload: string; // nested JSON string
}

function parseVoiceCommand(
  transcript: string
): "END_INTERVIEW" | "SKIP_QUESTION" | "STOP_RECORDING" | "NEXT_QUESTION" | null {
  const clean = transcript
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const stripped = clean
    .replace(/^(please|can you|can we|could we|um|uh|okay)\s+/, "")
    .replace(/\s+(please|thank you)$/, "")
    .trim();

  if (
    stripped === "end interview" ||
    stripped === "finish interview" ||
    stripped === "quit interview" ||
    stripped === "exit interview" ||
    stripped === "stop interview"
  ) {
    return "END_INTERVIEW";
  }

  if (
    stripped === "next question" ||
    stripped === "skip" ||
    stripped === "skip question" ||
    stripped === "skip this question" ||
    stripped === "pass"
  ) {
    return "SKIP_QUESTION";
  }

  if (
    stripped === "stop" ||
    stripped === "stop recording" ||
    stripped === "done answering" ||
    stripped === "done" ||
    stripped === "i am done" ||
    stripped === "im done" ||
    stripped === "finished" ||
    stripped === "that is all" ||
    stripped === "thats all"
  ) {
    return "STOP_RECORDING";
  }

  if (
    stripped === "next" ||
    stripped === "continue" ||
    stripped === "proceed"
  ) {
    return "NEXT_QUESTION";
  }

  return null;
}

/**
 * ImmersiveInterviewScreen
 *
 * Hosts the <UnityView> and acts as the React Native side of the UaaL bridge.
 * Drives the full interview conversation loop:
 *
 *   Unity (mic recording)
 *     → TRANSCRIPT_READY (emits audio path)
 *     → transcribeAudio() [Daniel's backend /interview/transcribe via Groq/Gemini]
 *     → submitInterviewAnswer() [Daniel's existing scoring API]
 *     → SHOW_FEEDBACK / SHOW_QUESTION → Unity
 *     → on complete → InterviewSummaryScreen [existing, unmodified]
 *
 * All failures handled in-world via VR dialogue feedback (no 2D Alert modals).
 */
export default function ImmersiveInterviewScreen() {
  const router = useRouter();
  const unityRef = useRef<UnityView>(null);
  const pendingNextQuestionRef = useRef<{ question: string } | null>(null);

  // Deterministic lifecycle refs to prevent race conditions / duplicate messages
  const isUnityReadyRef = useRef(false);
  const sceneLoadedRef = useRef(false);
  const hasRequestedSceneRef = useRef(false);
  const hasSentInitialQuestionRef = useRef(false);

  // Timing & watchdog refs
  const recordingStoppedTimeRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUser = useAuthStore((s) => s.currentUser);
  const activeAnalysis = useResumeStore((s) => s.activeAnalysis);
  const { session, submitAnswer } = useInterviewStore();

  const [unityReady, setUnityReady] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Derive Unity scene name from the session's interviewType
  const sceneName =
    session?.interviewType === "panel" ||
    session?.interviewType === ("immersive-panel" as any)
      ? "SampleScene" // AIRIS PANEL scene (Scene 0 in Build Settings)
      : "OneOnOne";    // AIRIS 1-on-1 scene (Scene 1 in Build Settings)

  // Reset lifecycle refs on mount or session change
  useEffect(() => {
    isUnityReadyRef.current = false;
    sceneLoadedRef.current = false;
    hasRequestedSceneRef.current = false;
    hasSentInitialQuestionRef.current = false;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnityReady(false);
    setSceneLoaded(false);
    setIsProcessing(false);
  }, [session?.sessionId]);

  // Clean up watchdog timer on unmount
  useEffect(() => {
    return () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Send a typed message to the UaaLBridge GameObject in Unity.
   * Uses the ref instance method (not a module-level static).
   */
  const postToUnity = useCallback((type: string, payload: object = {}) => {
    if (!unityRef.current) {
      console.warn("[Immersive] postToUnity called but UnityView ref is null");
      return;
    }
    const envelope: BridgeEnvelope = {
      type,
      payload: JSON.stringify(payload),
    };
    unityRef.current.postMessage(
      "UaaLBridge",
      "ReceiveMessage",
      JSON.stringify(envelope)
    );
  }, []);

  /** Build the parsedResume dict exactly as ActiveSimulationScreen does. */
  const getParsedResumeDict = useCallback((): Record<string, string> => {
    const dict: Record<string, string> = {};
    if (!activeAnalysis) return dict;
    if (Array.isArray(activeAnalysis.parsedSections)) {
      for (const sec of activeAnalysis.parsedSections) {
        dict[sec.name] = sec.content;
      }
    } else {
      Object.assign(dict, activeAnalysis.parsedSections || {});
    }
    return dict;
  }, [activeAnalysis]);

  // ─── Effect: send first question once scene is loaded ─────────────────────
  useEffect(() => {
    if (sceneLoaded && session?.currentQuestion && !hasSentInitialQuestionRef.current) {
      hasSentInitialQuestionRef.current = true;
      console.log(`[VR][QUESTION_CONTEXT] targetRole="${session.targetRole}" program="${session.program}" resumeId="${session.resumeId}"`);
      console.log(`[VR][QUESTION_READY] question="${session.currentQuestion}"`);
      console.log("[TIMING][VR] Sending initial SHOW_QUESTION:", session.currentQuestion);
      postToUnity("SHOW_QUESTION", {
        questionText: session.currentQuestion,
        speakerIndex: sceneName === "SampleScene" ? 1 : 0,
        speakerName: sceneName === "SampleScene" ? "Claudia" : "Interviewer",
      });
    }
  }, [sceneLoaded, session?.currentQuestion, sceneName, postToUnity]);

  // Lock landscape on mount; clean up and restore portrait on unmount
  useEffect(() => {
    AirisOrientation.lockLandscape();
    return () => {
      postToUnity("STOP_RECORDING");
      AirisOrientation.lockPortrait();
    };
  }, [postToUnity]);

  // Handle hardware Back button to cleanly exit VR session
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      console.log("[Immersive] Hardware Back pressed — stopping session and returning to menu");
      postToUnity("STOP_RECORDING");
      AirisOrientation.lockPortrait();
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [postToUnity, router]);

  // Initiate scene synchronization for warm UnityPlayer re-entry (or initial handshake)
  useEffect(() => {
    if (!sceneLoadedRef.current && !hasRequestedSceneRef.current) {
      hasRequestedSceneRef.current = true;
      console.log("[Immersive] Initiating scene sync for:", sceneName);
      postToUnity("LOAD_SCENE", { sceneName });
    }
  }, [sceneName, postToUnity]);

  // Helper to establish Unity readiness & trigger scene load/confirmation
  const confirmUnityRuntimeReady = useCallback(() => {
    if (!isUnityReadyRef.current) {
      isUnityReadyRef.current = true;
      setUnityReady(true);
      console.log("[Immersive] Unity runtime ready");
    }
  }, []);

  // ─── Unity message handler ────────────────────────────────────────────────
  const onUnityMessage = useCallback(
    async (event: NativeSyntheticEvent<{ message: string }>) => {
      const raw = event.nativeEvent.message;
      console.log("[Immersive] onUnityMessage received:", raw);

      let msg: BridgeEnvelope;
      try {
        msg = JSON.parse(raw);
      } catch {
        console.warn("[Immersive] Could not parse Unity message:", raw);
        return;
      }

      switch (msg.type) {
        // ── Unity finished initialising ─────────────────────────────────────
        case "UNITY_READY": {
          confirmUnityRuntimeReady();
          if (!sceneLoadedRef.current) {
            hasRequestedSceneRef.current = true;
            console.log("[Immersive] UNITY_READY received. Requesting scene:", sceneName);
            postToUnity("LOAD_SCENE", { sceneName });
          }
          break;
        }

        // ── Scene fully loaded ──────────────────────────────────────────────
        case "SCENE_LOADED": {
          confirmUnityRuntimeReady();

          let loadedScene = "";
          try {
            const p = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
            loadedScene = p?.sceneName || "";
          } catch {
            console.warn("[Immersive] Could not parse SCENE_LOADED payload:", msg.payload);
          }

          console.log(`[Immersive] SCENE_LOADED received: '${loadedScene}'. Target scene is '${sceneName}'.`);

          const isMatch =
            loadedScene && loadedScene.toLowerCase() === sceneName.toLowerCase();

          if (isMatch) {
            if (!sceneLoadedRef.current) {
              sceneLoadedRef.current = true;
              setSceneLoaded(true);
              console.log("[Immersive] Scene confirmed ready:", sceneName);
            }
          } else {
            hasRequestedSceneRef.current = true;
            console.log(`[Immersive] Scene mismatch ('${loadedScene}' != '${sceneName}'). Requesting scene:`, sceneName);
            postToUnity("LOAD_SCENE", { sceneName });
          }
          break;
        }

        // ── TTS finished speaking the question → start recording ───────────
        case "QUESTION_SPOKEN": {
          setUnityReady(true);
          setSceneLoaded(true);
          console.log("[TIMING][VR] QUESTION_SPOKEN received → initiating START_RECORDING");
          postToUnity("START_RECORDING");
          break;
        }

        // ── Feedback TTS finished speaking ─────────────────────────────────
        case "FEEDBACK_SPOKEN": {
          setUnityReady(true);
          setSceneLoaded(true);
          console.log("[TIMING][VR] FEEDBACK_SPOKEN received — waiting for user to click Next Question");
          break;
        }

        // ── User clicked Next Question in VR ────────────────────────────────
        case "NEXT_QUESTION": {
          console.log("[TIMING][VR] NEXT_QUESTION received from Unity VR");
          if (pendingNextQuestionRef.current) {
            console.log(`[VR][QUESTION_READY] question="${pendingNextQuestionRef.current.question}"`);
            console.log("[TIMING][VR] Dispatching next SHOW_QUESTION:", pendingNextQuestionRef.current.question);
            postToUnity("SHOW_QUESTION", {
              questionText: pendingNextQuestionRef.current.question,
              speakerIndex: sceneName === "SampleScene" ? 1 : 0,
              speakerName: sceneName === "SampleScene" ? "Claudia" : "Interviewer",
            });
            pendingNextQuestionRef.current = null;
          }
          break;
        }

        // ── Mic started (informational) ─────────────────────────────────────
        case "RECORDING_STARTED": {
          setUnityReady(true);
          setSceneLoaded(true);
          console.log("[TIMING][VR] RECORDING_STARTED confirmed by Unity");
          break;
        }

        // ── Mic stopped, audio saving in progress ───────────────────────────
        case "RECORDING_STOPPED": {
          setIsProcessing(true);
          recordingStoppedTimeRef.current = Date.now();
          console.log(`[TIMING][VR] RECORDING_STOPPED at ${new Date().toISOString()}`);

          // Watchdog: If TRANSCRIPT_READY is not received within 20s, fail-safe to VR feedback
          if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = setTimeout(() => {
            console.warn("[TIMING][VR] Watchdog timeout: No audio handoff received within 20s");
            setIsProcessing(false);
            postToUnity("SHOW_FEEDBACK", {
              feedback: "Processing timed out. Please tap the button to try answering again.",
              speakerIndex: sceneName === "SampleScene" ? 1 : 0,
              score: 0,
            });
          }, 20000);
          break;
        }

        // ── Unity finished recording & passed audio file path or transcript ─
        case "TRANSCRIPT_READY": {
          setUnityReady(true);
          setSceneLoaded(true);
          setIsProcessing(true);

          if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }

          let rawTranscript = "";
          try {
            const p = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
            rawTranscript = p?.transcript || "";
          } catch {
            console.warn("[Immersive] Could not parse TRANSCRIPT_READY payload:", msg.payload);
          }

          if (!session || !currentUser) {
            setIsProcessing(false);
            break;
          }

          const handoffMs = recordingStoppedTimeRef.current
            ? Date.now() - recordingStoppedTimeRef.current
            : 0;

          try {
            let finalTranscript = rawTranscript;
            let pauseMetrics: PauseMetrics | undefined = undefined;

            // Check if payload is an audio file path saved by Unity
            const isAudioPath =
              rawTranscript.toLowerCase().endsWith(".wav") ||
              rawTranscript.toLowerCase().endsWith(".m4a") ||
              rawTranscript.startsWith("/") ||
              rawTranscript.startsWith("file://");

            if (isAudioPath) {
              const audioUri = rawTranscript.startsWith("file://")
                ? rawTranscript
                : `file://${rawTranscript}`;
              console.log(`[VR][RN_RECEIVED_AUDIO] path=${audioUri}`);
              console.log(`[VR][BACKEND_TRANSCRIPTION_START]`);
              console.log(
                `[TIMING][VR] Audio file handed off in ${handoffMs}ms: ${audioUri}. Starting backend transcription...`
              );

              const tStartTranscribe = Date.now();

              // Race transcription with a 20-second timeout guard
              const transcribePromise = transcribeAudio(audioUri, "audio/wav");
              const transcribeTimeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Transcription timed out after 20s")), 20000)
              );

              const transcribeRes = await Promise.race([transcribePromise, transcribeTimeout]);
              const transcribeMs = Date.now() - tStartTranscribe;
              console.log(
                `[VR][BACKEND_TRANSCRIPTION_COMPLETE] ms=${transcribeMs} transcript="${transcribeRes.transcription}"`
              );
              console.log(
                `[TIMING][VR] Backend transcription completed in ${transcribeMs}ms: "${transcribeRes.transcription}"`
              );

              finalTranscript = transcribeRes.transcription || "";
              pauseMetrics = transcribeRes.pauseMetrics;
            } else {
              console.log(`[TIMING][VR] Received direct text transcript: "${finalTranscript}"`);
            }

            // ═════════════════════════════════════════════════════════════════
            // 1. STATE-AWARE VOICE COMMANDS
            // ═════════════════════════════════════════════════════════════════
            const command = parseVoiceCommand(finalTranscript);
            if (command === "END_INTERVIEW") {
              console.log("[VR][VOICE_COMMAND] Action: END_INTERVIEW");
              postToUnity("STOP_RECORDING");
              postToUnity("END_INTERVIEW", {
                closingMessage: "Interview session terminated.",
              });
              setTimeout(() => {
                AirisOrientation.lockPortrait();
                router.back();
              }, 1500);
              return;
            }

            if (command === "SKIP_QUESTION") {
              console.log("[VR][VOICE_COMMAND] Action: SKIP_QUESTION (submitting as skip)");
              finalTranscript = "skip";
            } else if (command === "NEXT_QUESTION" && pendingNextQuestionRef.current) {
              console.log("[VR][VOICE_COMMAND] Action: NEXT_QUESTION during feedback review");
              postToUnity("SHOW_QUESTION", {
                questionText: pendingNextQuestionRef.current.question,
                speakerIndex: sceneName === "SampleScene" ? 1 : 0,
                speakerName: sceneName === "SampleScene" ? "Claudia" : "Interviewer",
              });
              pendingNextQuestionRef.current = null;
              return;
            }

            // ═════════════════════════════════════════════════════════════════
            // 2. EMPTY / INAUDIBLE SPEECH RETRY (NO DEAD ENDS)
            // ═════════════════════════════════════════════════════════════════
            if (!finalTranscript.trim()) {
              console.warn("[TIMING][VR] Transcription yielded empty speech — prompting candidate retry");
              postToUnity("SHOW_QUESTION", {
                questionText: "I didn't hear your response clearly. Please try answering again.",
                speakerIndex: sceneName === "SampleScene" ? 1 : 0,
                speakerName: sceneName === "SampleScene" ? "Claudia" : "Interviewer",
              });
              return;
            }

            // ═════════════════════════════════════════════════════════════════
            // 3. CALL DANIEL'S EXISTING SCORING PIPELINE WITH 30S ABORT GUARD
            // ═════════════════════════════════════════════════════════════════
            const tStartEval = Date.now();
            console.log(`[VR][ANSWER_SUBMIT] length=${finalTranscript.length}`);
            console.log(`[TIMING][VR] Submitting answer for scoring evaluation...`);

            const abortController = new AbortController();
            const evalTimeout = setTimeout(() => abortController.abort(), 30000);

            let response;
            try {
              response = await submitInterviewAnswer(
                {
                  targetRole: session.targetRole,
                  program: session.program,
                  parsedResume: getParsedResumeDict(),
                  history: session.history,
                  currentQuestion: session.currentQuestion,
                  currentAnswer: finalTranscript,
                  currentQuestionType: session.currentQuestionType || "general",
                  currentBenchmarkAnswer: session.currentBenchmarkAnswer || "",
                  totalQuestions: session.totalQuestions,
                  pauseMetrics,
                },
                { signal: abortController.signal }
              );
            } finally {
              clearTimeout(evalTimeout);
            }

            const evalMs = Date.now() - tStartEval;
            const totalTurnaroundMs = recordingStoppedTimeRef.current
              ? Date.now() - recordingStoppedTimeRef.current
              : evalMs;
            console.log(
              `[VR][AI_RESPONSE] score=${response.evaluation?.score} evalMs=${evalMs} totalMs=${totalTurnaroundMs}`
            );
            console.log(
              `[TIMING][VR] AI evaluation completed in ${evalMs}ms (total roundtrip ${totalTurnaroundMs}ms), score: ${response.evaluation?.score}`
            );

            // Update Zustand store — same authoritative call as ActiveSimulationScreen
            submitAnswer(
              finalTranscript,
              response.evaluation,
              response.nextQuestion?.question,
              response.nextQuestion?.questionType,
              response.nextQuestion?.benchmarkAnswer,
              response.isComplete,
              response.isInteractionEvent
            );

            if (response.isComplete) {
              console.log("[TIMING][VR] Interview complete — triggering END_INTERVIEW");
              postToUnity("END_INTERVIEW", {
                closingMessage:
                  "Thank you for completing your interview simulation with AIRIS. Your results are being prepared.",
              });
              setTimeout(() => {
                AirisOrientation.lockPortrait();
                router.push("/(student)/interview-session/summary" as any);
              }, 4000);
            } else if (response.isInteractionEvent) {
              // Conversational interaction event (e.g. clarification or 'wait a moment')
              console.log("[TIMING][VR] Interaction event returned from backend — speaking interaction prompt directly");
              postToUnity("SHOW_QUESTION", {
                questionText: response.nextQuestion?.question || "Take your time. Whenever you are ready.",
                speakerIndex: sceneName === "SampleScene" ? 1 : 0,
                speakerName: sceneName === "SampleScene" ? "Claudia" : "Interviewer",
              });
            } else {
              pendingNextQuestionRef.current = response.nextQuestion
                ? { question: response.nextQuestion.question }
                : null;

              // Show brief feedback bubble & trigger feedback TTS in Unity
              postToUnity("SHOW_FEEDBACK", {
                feedback: response.evaluation?.feedback || "Thank you for your response.",
                speakerIndex: sceneName === "SampleScene" ? 1 : 0,
                score: response.evaluation?.score ?? 0,
              });
            }
          } catch (error: any) {
            console.error("[TIMING][VR] Processing error:", error?.message || error);
            // In-world VR feedback — never pop a 2D Android Alert modal in VR
            postToUnity("SHOW_FEEDBACK", {
              feedback: "There was a problem processing your answer. Please tap Stop Recording to try again.",
              speakerIndex: sceneName === "SampleScene" ? 1 : 0,
              score: 0,
            });
          } finally {
            setIsProcessing(false);
          }
          break;
        }

        // ── Unity confirmed interview closed ────────────────────────────────
        case "SESSION_EXIT": {
          console.log("[Immersive] Exit requested from Unity VR — restoring portrait and returning to menu.");
          postToUnity("STOP_RECORDING");
          AirisOrientation.lockPortrait();
          router.back();
          break;
        }

        case "INTERVIEW_ENDED": {
          console.log("[Immersive] Interview ended in Unity — restoring portrait and navigating to summary.");
          postToUnity("STOP_RECORDING");
          AirisOrientation.lockPortrait();
          router.push("/(student)/interview-session/summary" as any);
          break;
        }

        default: {
          console.log("[Immersive] Unhandled Unity message type:", msg.type);
        }
      }
    },
    [session, currentUser, postToUnity, sceneName, getParsedResumeDict, submitAnswer, router, confirmUnityRuntimeReady]
  );


  if (!session) {
    return (
      <View style={styles.container}>
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Session not found.</Text>
          <Text style={styles.overlaySubtitle}>Please restart the interview.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden translucent backgroundColor="transparent" />
      <UnityView
        ref={unityRef}
        style={styles.unity}
        fullScreen={true}
        onUnityMessage={onUnityMessage}
        androidKeepPlayerMounted
      />

      {/* Loading overlay — shown until Unity scene is ready */}
      {!sceneLoaded && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#F4A47A" />
          <Text style={styles.overlayTitle}>Loading Interview Environment...</Text>
          <Text style={styles.overlaySubtitle}>
            {unityReady ? "Loading virtual scene..." : "Initialising VR runtime..."}
          </Text>
        </View>
      )}

      {/* Processing badge — shown during AI evaluation (POST /interview/answer) */}
      {sceneLoaded && isProcessing && (
        <View style={styles.processingBadge}>
          <ActivityIndicator size="small" color="#F4A47A" />
          <Text style={styles.processingText}>Evaluating response...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1F3A5F",
  },
  unity: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(31, 58, 95, 0.97)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  overlayTitle: {
    color: "white",
    fontWeight: "800",
    fontSize: 18,
    marginTop: 20,
    textAlign: "center",
  },
  overlaySubtitle: {
    color: "#BFD6EA",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  processingBadge: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(31, 58, 95, 0.9)",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#F4A47A",
  },
  processingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
});