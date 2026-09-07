import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  NativeSyntheticEvent,
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
      ? "Office"    // AIRIS PANEL scene
      : "OneOnOne"; // AIRIS 1-on-1 scene

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
    if (sceneLoaded && session?.currentQuestion) {
      console.log("[Immersive] Scene loaded. Sending first question to Unity:", session.currentQuestion);
      postToUnity("SHOW_QUESTION", {
        questionText: session.currentQuestion,
        speakerIndex: 1, // Claudia (lead) for panel; default for 1-on-1
        speakerName: "Claudia",
      });
    }
  }, [sceneLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fallback: Ping Unity / load scene if still waiting after mount ────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!sceneLoaded) {
        console.log("[Immersive] Scene not yet confirmed loaded after 2.5s — actively sending LOAD_SCENE to Unity:", sceneName);
        postToUnity("LOAD_SCENE", { sceneName });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [sceneLoaded, sceneName, postToUnity]);

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
          console.log("[Immersive] SCENE_LOADED received. Dismissing loading overlay.");
          setUnityReady(true);
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

        // ── Mic started (informational) ─────────────────────────────────────
        case "RECORDING_STARTED": {
          setUnityReady(true);
          setSceneLoaded(true);
          break;
        }

        // ── Mic stopped, Whisper running (informational) ───────────────────
        case "RECORDING_STOPPED": {
          setIsProcessing(true);
          break;
        }

        // ── Whisper transcription complete ──────────────────────────────────
        case "TRANSCRIPT_READY": {
          setUnityReady(true);
          setSceneLoaded(true);

          let transcript = "";
          try {
            const p = JSON.parse(msg.payload);
            transcript = p.transcript || "";
          } catch {
            console.warn("[Immersive] Could not parse TRANSCRIPT_READY payload");
          }

          if (!session || !currentUser) {
            setIsProcessing(false);
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
              currentBenchmarkAnswer: session.currentBenchmarkAnswer || "",
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
                router.push("/(student)/interview-session/summary" as any);
              }, 4000);
            } else {
              // Show brief feedback bubble, then the next question
              postToUnity("SHOW_FEEDBACK", {
                feedback: response.evaluation?.feedback || "Thank you for your response.",
                speakerIndex: 1,
                score: response.evaluation?.score ?? 0,
              });

              setTimeout(() => {
                if (response.nextQuestion) {
                  postToUnity("SHOW_QUESTION", {
                    questionText: response.nextQuestion.question,
                    speakerIndex: 1,
                    speakerName: "Claudia",
                  });
                }
              }, 4500); // Allow feedback TTS to finish
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
            setIsProcessing(false);
          }
          break;
        }

        // ── Unity confirmed interview closed ────────────────────────────────
        case "INTERVIEW_ENDED": {
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