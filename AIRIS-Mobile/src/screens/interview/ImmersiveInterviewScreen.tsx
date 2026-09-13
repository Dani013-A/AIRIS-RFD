import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  NativeSyntheticEvent,
  StatusBar,
} from "react-native";
import UnityView from "@azesmway/react-native-unity";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";

// ── Daniel's existing scoring pipeline — reused exactly ─────────────────────
import { submitInterviewAnswer } from "../../services/api/interviewApi";

// ── Bridge types ────────────────────────────────────────────────────────────
interface BridgeEnvelope {
  type: string;
  payload: string; // nested JSON string
}

/**
 * ImmersiveInterviewScreen
 *
 * Hosts the <UnityView> and acts as the React Native side of the UaaL bridge.
 * Drives the full interview conversation loop:
 *
 *   Unity (mic + Whisper STT)
 *     → TRANSCRIPT_READY → submitInterviewAnswer() [Daniel's existing API]
 *     → SHOW_FEEDBACK / SHOW_QUESTION → Unity
 *     → on complete → InterviewSummaryScreen [existing, unmodified]
 *
 * No new backend endpoints. No new Firestore code.
 * postMessage() is called via the UnityView ref instance method.
 * onUnityMessage receives NativeSyntheticEvent<{message: string}>.
 */
export default function ImmersiveInterviewScreen() {
  const router = useRouter();
  const unityRef = useRef<UnityView>(null);
  const pendingNextQuestionRef = useRef<{ question: string } | null>(null);

  const currentUser = useAuthStore((s) => s.currentUser);
  const activeAnalysis = useResumeStore((s) => s.activeAnalysis);
  const { session, submitAnswer } = useInterviewStore();

  const [unityReady, setUnityReady] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);

  // ─── Two-stage processing badge (mutually exclusive) ───────────────────────
  // Stage 1: isTranscribing — set on RECORDING_STOPPED (Whisper running).
  //           Cleared at the top of TRANSCRIPT_READY before the API call begins.
  // Stage 2: isEvaluating  — set when API call starts (TRANSCRIPT_READY).
  //           Cleared in the finally{} block after SHOW_FEEDBACK is dispatched.
  // The two flags are never true simultaneously by construction.
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // ─── Panel speaker rotation (SampleScene only) ────────────────────────────
  // Replicates the EXACT [Claudia(1) → Eric(2) → Claudia(1) → Carla(0)] cycle
  // from InterviewManager.cs:308-332 — 50% Claudia, 25% Eric, 25% Carla.
  // Counter is incremented ONLY when a new base question is dispatched (not
  // follow-ups or interstitial feedback), so the rotation stays in sync.
  // Using useRef rather than useState to avoid unnecessary re-renders.
  const panelQuestionCounterRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneLoadedRef = useRef(false);

  /** Panel speaker pattern — index maps directly to DialogueManager.ShowSpeaker(). */
  const PANEL_SPEAKER_PATTERN: [number, string][] = [
    [1, "Claudia"], // Q1, Q3, Q5 … (Lead — 50%)
    [2, "Eric"],    // Q2, Q6 …     (Right — 25%)
    [1, "Claudia"], // (repeated)
    [0, "Carla"],   // Q4, Q8 …     (Left — 25%)
  ];

  /**
   * Returns { speakerIndex, speakerName } for the NEXT base question in
   * the panel rotation, then advances the counter.
   * Call ONLY when dispatching a new top-level question in SampleScene.
   */
  const advancePanelSpeaker = useCallback((): { speakerIndex: number; speakerName: string } => {
    const [speakerIndex, speakerName] =
      PANEL_SPEAKER_PATTERN[panelQuestionCounterRef.current % PANEL_SPEAKER_PATTERN.length];
    console.log(
      `[Immersive] Panel rotation — Q${panelQuestionCounterRef.current + 1}: speakerIndex=${speakerIndex} (${speakerName})`
    );
    panelQuestionCounterRef.current += 1;
    return { speakerIndex, speakerName };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive Unity scene name from the session's interviewType
  const sceneName =
    session?.interviewType === "panel" ||
    session?.interviewType === ("immersive-panel" as any)
      ? "SampleScene" // AIRIS PANEL scene (Scene 0 in Build Settings)
      : "OneOnOne";    // AIRIS 1-on-1 scene (Scene 1 in Build Settings)

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

  useEffect(() => {
    sceneLoadedRef.current = sceneLoaded;
  }, [sceneLoaded]);

  // ─── Effect: send first question once scene is loaded ─────────────────────
  useEffect(() => {
    if (sceneLoaded && session?.currentQuestion) {
      console.log("[Immersive] Scene loaded. Sending first question to Unity:", session.currentQuestion);
      if (sceneName === "SampleScene") {
        // Q1 always starts the rotation — advance the panel rotation counter.
        const { speakerIndex, speakerName } = advancePanelSpeaker();
        postToUnity("SHOW_QUESTION", {
          questionText: session.currentQuestion,
          speakerIndex,
          speakerName,
        });
      } else {
        // OneOnOne: single interviewer, always index 0.
        postToUnity("SHOW_QUESTION", {
          questionText: session.currentQuestion,
          speakerIndex: 0,
          speakerName: "Interviewer",
        });
      }
    }
  }, [sceneLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fallback: Ping Unity / load scene if still waiting after mount ────────
  useEffect(() => {
    fallbackTimerRef.current = setTimeout(() => {
      if (!sceneLoadedRef.current) {
        console.log("[Immersive] Scene not yet confirmed loaded after 8.0s — actively sending LOAD_SCENE fallback to Unity:", sceneName);
        postToUnity("LOAD_SCENE", { sceneName });
      }
    }, 8000);
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [sceneName, postToUnity]);

  // Ensure orientation is restored to Portrait whenever leaving the immersive screen
  useEffect(() => {
    return () => {
      postToUnity("RESTORE_PORTRAIT", {});
    };
  }, [postToUnity]);

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
          console.log("[Immersive] UNITY_READY received. Requesting scene:", sceneName);
          setUnityReady(true);
          postToUnity("LOAD_SCENE", { sceneName });
          break;
        }

        // ── Scene fully loaded ──────────────────────────────────────────────
        case "SCENE_LOADED": {
          let loadedScene = "";
          try {
            const p = JSON.parse(msg.payload);
            loadedScene = p.sceneName || "";
          } catch {
            console.warn("[Immersive] Could not parse SCENE_LOADED payload:", msg.payload);
          }

          console.log(
            `[Immersive] SCENE_LOADED received: '${loadedScene}'. Target scene is '${sceneName}'.`
          );
          setUnityReady(true);

          // If the loaded scene does not match the intended interview scene, actively demand Unity switch!
          if (loadedScene && loadedScene.toLowerCase() !== sceneName.toLowerCase()) {
            console.log(
              `[Immersive] Scene mismatch ('${loadedScene}' != '${sceneName}'). Actively requesting '${sceneName}' from Unity...`
            );
            postToUnity("LOAD_SCENE", { sceneName });
            return;
          }

          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }

          if (sceneLoadedRef.current) {
            console.log(
              `[Immersive] Scene '${sceneName}' was already confirmed loaded. Ignoring duplicate SCENE_LOADED event.`
            );
            return;
          }

          console.log(
            `[Immersive] Scene '${sceneName}' confirmed loaded. Dismissing loading overlay.`
          );
          sceneLoadedRef.current = true;
          setSceneLoaded(true);
          // first SHOW_QUESTION is sent by the useEffect above
          break;
        }

        // ── TTS finished speaking the question → start recording ───────────
        case "QUESTION_SPOKEN": {
          setUnityReady(true);
          setSceneLoaded(true);
          postToUnity("START_RECORDING");
          break;
        }

        // ── Mic stopped, Whisper running (informational) ───────────────────
        case "RECORDING_STOPPED": {
          // Stage 1: Whisper transcription in progress — switch badge to Transcribing.
          setIsTranscribing(true);
          break;
        }

        // ── Feedback TTS finished speaking → show next question ───────────
        case "FEEDBACK_SPOKEN": {
          setUnityReady(true);
          setSceneLoaded(true);
          if (pendingNextQuestionRef.current) {
            if (sceneName === "SampleScene") {
              // Advance the panel rotation for each new base question.
              const { speakerIndex, speakerName } = advancePanelSpeaker();
              postToUnity("SHOW_QUESTION", {
                questionText: pendingNextQuestionRef.current.question,
                speakerIndex,
                speakerName,
              });
            } else {
              // OneOnOne: single interviewer, always index 0.
              postToUnity("SHOW_QUESTION", {
                questionText: pendingNextQuestionRef.current.question,
                speakerIndex: 0,
                speakerName: "Interviewer",
              });
            }
            pendingNextQuestionRef.current = null;
          }
          break;
        }

        // ── Mic started (informational) ─────────────────────────────────────
        case "RECORDING_STARTED": {
          setUnityReady(true);
          setSceneLoaded(true);
          break;
        }

        // ── Whisper transcription complete ──────────────────────────────────
        case "TRANSCRIPT_READY": {
          setUnityReady(true);
          setSceneLoaded(true);

          // Stage 1 → Stage 2: Whisper done, API evaluation begins.
          // The two flags are never simultaneously true — isTranscribing clears
          // before isEvaluating sets, so the badge text transitions atomically.
          setIsTranscribing(false);
          setIsEvaluating(true);

          let transcript = "";
          try {
            const p = JSON.parse(msg.payload);
            transcript = p.transcript || "";
          } catch {
            console.warn("[Immersive] Could not parse TRANSCRIPT_READY payload");
          }

          if (!session || !currentUser) {
            setIsEvaluating(false);
            break;
          }

          try {
            // ═══════════════════════════════════════════════════════════════════
            // CALL DANIEL'S EXISTING SCORING PIPELINE — UNCHANGED
            // This is the exact same function call that ActiveSimulationScreen
            // makes. No changes to interviewApi.ts needed.
            // ═══════════════════════════════════════════════════════════════════
            const response = await submitInterviewAnswer({
              targetRole: session.targetRole,
              program: session.program,
              parsedResume: getParsedResumeDict(),
              history: session.history,
              currentQuestion: session.currentQuestion,
              currentAnswer: transcript,
              currentQuestionType: session.currentQuestionType || "general",
              totalQuestions: session.totalQuestions,
            });

            // Update Zustand store — same call as ActiveSimulationScreen
            submitAnswer(
              transcript,
              response.evaluation,
              response.nextQuestion?.question,
              response.nextQuestion?.questionType,
              response.nextQuestion?.benchmarkAnswer,
              response.isComplete,
              response.isInteractionEvent
            );

            if (response.isComplete) {
              // Play closing animation/TTS in Unity, then navigate to the
              // existing InterviewSummaryScreen (handles report + Firestore)
              postToUnity("END_INTERVIEW", {
                closingMessage:
                  "Thank you for completing your interview simulation with AIRIS. Your results are being prepared.",
              });
              setTimeout(() => {
                postToUnity("RESTORE_PORTRAIT", {});
                router.push("/(student)/interview-session/summary" as any);
              }, 4000);
            } else {
              pendingNextQuestionRef.current = response.nextQuestion
                ? { question: response.nextQuestion.question }
                : null;

              // Show brief feedback bubble & trigger feedback TTS in Unity
              postToUnity("SHOW_FEEDBACK", {
                feedback: response.evaluation?.feedback || "Thank you for your response.",
                speakerIndex: 1,
                score: response.evaluation?.score ?? 0,
              });
            }
          } catch (error) {
            console.error("[Immersive] Scoring error:", error);
            Alert.alert(
              "Scoring Error",
              "Failed to evaluate your response. Please check your connection.",
              [
                {
                  text: "Retry Recording",
                  onPress: () => postToUnity("START_RECORDING"),
                },
                {
                  text: "Exit Interview",
                  style: "destructive",
                  onPress: () => router.replace("/(student)/(tabs)/interview" as any),
                },
              ]
            );
          } finally {
            // Stage 2 complete — badge hides. SHOW_FEEDBACK was already dispatched
            // inside the try block; this runs whether the API call succeeded or threw.
            setIsEvaluating(false);
          }
          break;
        }

        // ── Unity confirmed interview closed ────────────────────────────────
        case "SESSION_EXIT": {
          console.log("[Immersive] Exit requested from Unity VR — restoring portrait and returning to menu.");
          postToUnity("RESTORE_PORTRAIT", {});
          router.back();
          break;
        }

        case "INTERVIEW_ENDED": {
          console.log("[Immersive] Interview ended in Unity — restoring portrait and navigating to summary.");
          postToUnity("RESTORE_PORTRAIT", {});
          router.push("/(student)/interview-session/summary" as any);
          break;
        }

        default: {
          console.log("[Immersive] Unhandled Unity message type:", msg.type);
        }
      }
    },
    [session, currentUser, postToUnity, sceneName, getParsedResumeDict, submitAnswer, router]
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

      {/* Transcribing badge — Stage 1: Whisper running (RECORDING_STOPPED → TRANSCRIPT_READY) */}
      {sceneLoaded && isTranscribing && (
        <View style={styles.processingBadge}>
          <ActivityIndicator size="small" color="#F4A47A" />
          <Text style={styles.processingText}>Transcribing your answer...</Text>
        </View>
      )}

      {/* Evaluating badge — Stage 2: API call in flight (TRANSCRIPT_READY → SHOW_FEEDBACK) */}
      {sceneLoaded && isEvaluating && (
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
    ...StyleSheet.absoluteFillObject,
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