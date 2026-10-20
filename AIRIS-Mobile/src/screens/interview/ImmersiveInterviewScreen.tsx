import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  NativeSyntheticEvent,
  StatusBar,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import UnityView from "@azesmway/react-native-unity";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";
import AirisOrientation from "../../utils/AirisOrientation";
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
  openMicrophoneSettings,
} from "../../utils/audioPermission";

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

// ── State safety types ──────────────────────────────────────────────────────
type VRInterviewState =
  | "INTERVIEWER_SPEAKING"
  | "USER_LISTENING"
  | "WAITING_FOR_AUDIO"
  | "PROCESSING_ANSWER"
  | "INTERVIEWER_FEEDBACK"
  | "WAITING_FOR_NEXT_QUESTION_COMMAND"
  | "EXITING";

import { parseVRVoiceCommand } from "./voiceCommands";
import { AudioHandoffGuard } from "./audioHandoffGuard";
import { withTimeout } from "../../utils/promiseTimeout";

/**
 * ImmersiveInterviewScreen
 *
 * Hosts the <UnityView> and drives the hands-free VR conversation loop:
 *
 *   INTERVIEWER ASKS QUESTION (TTS + elevated speech bubble)
 *           ↓
 *   USER SPEAKS NATURALLY
 *           ↓
 *   5 SECOND POST-SPEECH SILENCE THRESHOLD (Unity RecordingManager)
 *           ↓
 *   AUDIO WAV SAVED → RN HANDOFF
 *           ↓
 *   BACKEND TRANSCRIPTION (/interview/transcribe)
 *           ↓
 *   BACKEND EVALUATION (/interview/answer)
 *           ↓
 *   INTERVIEWER FEEDBACK (TTS + elevated speech bubble)
 *           ↓
 *   USER SAYS "NEXT QUESTION" → ADVANCE TO NEXT QUESTION
 *           ↓
 *   USER SAYS "STOP" → EXIT IMMERSIVE VR & RETURN TO INTERVIEW ONBOARDING
 */
export interface VRSpeaker {
  index: number;
  name: string;
}

const PANEL_INTERVIEWERS: VRSpeaker[] = [
  { index: 1, name: "Claudia" }, // Lead / Systems Overview (Center)
  { index: 2, name: "Eric" },    // Senior Technical Engineer (Right)
  { index: 0, name: "Carla" },   // Engineering Manager / Behavioral (Left)
];

function getSpeakerForQuestion(
  scene: string,
  questionNumber: number
): VRSpeaker {
  if (scene !== "SampleScene") {
    return { index: 0, name: "Interviewer" };
  }
  const idx = Math.max(0, questionNumber - 1) % PANEL_INTERVIEWERS.length;
  return PANEL_INTERVIEWERS[idx];
}

export default function ImmersiveInterviewScreen() {
  const router = useRouter();
  const unityRef = useRef<UnityView>(null);

  const currentUser = useAuthStore((s) => s.currentUser);
  const activeAnalysis = useResumeStore((s) => s.activeAnalysis);
  const { session, submitAnswer, clearSession } = useInterviewStore();

  // Derive Unity scene name from the session's interviewType
  const sceneName =
    session?.interviewType === "panel" ||
    session?.interviewType === ("immersive-panel" as any)
      ? "SampleScene" // AIRIS PANEL scene (Scene 0 in Build Settings)
      : "OneOnOne";    // AIRIS 1-on-1 scene (Scene 1 in Build Settings)

  const pendingNextQuestionRef = useRef<{ question: string; speaker: VRSpeaker } | null>(null);
  const currentSpeakerRef = useRef<VRSpeaker>(getSpeakerForQuestion(sceneName, 1));

  type SceneLoadingState = "idle" | "loading" | "loaded" | "exiting";

  // State machine ref & idempotency guards
  const stateRef = useRef<VRInterviewState>("INTERVIEWER_SPEAKING");
  const isExitingRef = useRef(false);
  const isProcessingAnswerRef = useRef(false);
  const audioHandoffRef = useRef(new AudioHandoffGuard());

  // Deterministic lifecycle refs
  const isUnityReadyRef = useRef(false);
  const sceneLoadedRef = useRef(false);
  const hasRequestedSceneRef = useRef(false);
  const hasSentInitialQuestionRef = useRef(false);
  const activeSessionIdRef = useRef<string | null>(session?.sessionId || null);
  const sceneLoadAttemptRef = useRef<number>(0);

  // Timing & watchdog refs
  const recordingStoppedTimeRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sceneLoadingState, setSceneLoadingState] = useState<SceneLoadingState>("idle");
  const [unityReady, setUnityReady] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);

  // ─── Permission Guard ─────────────────────────────────────────────────────
  // Enforces that Android RECORD_AUDIO permission is granted BEFORE Unity
  // is allowed to initialize the microphone capture flow.
  useEffect(() => {
    let isMounted = true;

    async function ensureMicAccess() {
      try {
        const isGranted = await checkMicrophonePermission();
        if (!isMounted) return;
        if (isGranted) {
          setHasMicPermission(true);
          return;
        }

        const res = await requestMicrophonePermission();
        if (!isMounted) return;
        if (res.granted) {
          setHasMicPermission(true);
        } else {
          setHasMicPermission(false);
          setIsPermissionBlocked(!res.canAskAgain || res.status === "blocked");
        }
      } catch (e) {
        console.warn("[Immersive] Microphone permission check error:", e);
        if (isMounted) {
          setHasMicPermission(false);
        }
      }
    }

    ensureMicAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  // Reset lifecycle refs on mount or session change
  useEffect(() => {
    isUnityReadyRef.current = false;
    sceneLoadedRef.current = false;
    hasRequestedSceneRef.current = false;
    hasSentInitialQuestionRef.current = false;
    isExitingRef.current = false;
    isProcessingAnswerRef.current = false;
    audioHandoffRef.current.cancel();
    stateRef.current = "INTERVIEWER_SPEAKING";
    activeSessionIdRef.current = session?.sessionId || null;
    sceneLoadAttemptRef.current = 0;

    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (sceneLoadingTimerRef.current) {
      clearTimeout(sceneLoadingTimerRef.current);
      sceneLoadingTimerRef.current = null;
    }
    if (listeningSafetyTimerRef.current) {
      clearTimeout(listeningSafetyTimerRef.current);
      listeningSafetyTimerRef.current = null;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnityReady(false);
    setSceneLoaded(false);
    setSceneLoadingState("idle");
  }, [session?.sessionId]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      isExitingRef.current = true;
      audioHandoffRef.current.cancel();
      activeAbortControllerRef.current?.abort();
      sceneLoadAttemptRef.current += 1;
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      if (sceneLoadingTimerRef.current) {
        clearTimeout(sceneLoadingTimerRef.current);
        sceneLoadingTimerRef.current = null;
      }
      if (listeningSafetyTimerRef.current) {
        clearTimeout(listeningSafetyTimerRef.current);
        listeningSafetyTimerRef.current = null;
      }
    };
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const postToUnity = useCallback((type: string, payload: object = {}) => {
    if (!unityRef.current) {
      console.warn(`[Immersive] postToUnity(${type}) called but UnityView ref is null`);
      return;
    }
    const envelope: BridgeEnvelope = {
      type,
      payload: JSON.stringify(payload),
    };
    console.log(`[Immersive] postToUnity: ${type} sent to UaaLBridge`);
    unityRef.current.postMessage(
      "UaaLBridge",
      "ReceiveMessage",
      JSON.stringify(envelope)
    );
  }, []);

  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Idempotent exit handler for "STOP" voice command or hardware back press.
   * Restores portrait orientation and cleanly returns to the interview onboarding/entry tab.
   * NEVER submits an answer, NEVER grades, NEVER shows arbitrary scores.
   */
  const handleStopInterview = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    audioHandoffRef.current.cancel();
    setSceneLoadingState("exiting");
    stateRef.current = "EXITING";
    console.log("[VR][VOICE_COMMAND] Action: STOP — Terminating immersive VR interview");

    if (activeAbortControllerRef.current) {
      try {
        activeAbortControllerRef.current.abort();
      } catch {}
      activeAbortControllerRef.current = null;
    }

    if (sceneLoadingTimerRef.current) {
      clearTimeout(sceneLoadingTimerRef.current);
      sceneLoadingTimerRef.current = null;
    }

    if (listeningSafetyTimerRef.current) {
      clearTimeout(listeningSafetyTimerRef.current);
      listeningSafetyTimerRef.current = null;
    }

    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }

    try {
      postToUnity("STOP_RECORDING");
      postToUnity("SESSION_EXIT");
    } catch (e) {
      console.warn("[Immersive] Error sending stop messages to Unity:", e);
    }

    clearSession();
    AirisOrientation.lockPortrait();
    console.log("[VR][VOICE_COMMAND] STOP is an exit command — restoring portrait and returning to interview onboarding flow");
    router.replace("/(student)/(tabs)/interview" as any);
  }, [clearSession, postToUnity, router]);

  const requestSceneIfReady = useCallback(() => {
    if (!hasMicPermission || !isUnityReadyRef.current || hasRequestedSceneRef.current || sceneLoadedRef.current || isExitingRef.current) return;
    hasRequestedSceneRef.current = true;
    postToUnity("LOAD_SCENE", { sceneName });
  }, [hasMicPermission, postToUnity, sceneName]);

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

  // ─── Effect: send first question once scene is loaded & mic permission verified ────
  useEffect(() => {
    const currentSession = useInterviewStore.getState().session;
    if (hasMicPermission && sceneLoadingState === "loaded" && currentSession?.currentQuestion && !hasSentInitialQuestionRef.current) {
      hasSentInitialQuestionRef.current = true;
      stateRef.current = "INTERVIEWER_SPEAKING";
      const initialSpeaker = getSpeakerForQuestion(sceneName, currentSession.questionsAsked || 1);
      currentSpeakerRef.current = initialSpeaker;
      console.log(`[VR][QUESTION_CONTEXT] targetRole="${currentSession.targetRole}" program="${currentSession.program}" resumeId="${currentSession.resumeId}"`);
      console.log(`[VR][QUESTION_READY] question="${currentSession.currentQuestion}" (speaker=${initialSpeaker.name})`);
      console.log("[TIMING][VR] Scheduling initial SHOW_QUESTION (1600ms after sceneLoaded):", currentSession.currentQuestion);
      const timer = setTimeout(() => {
        postToUnity("SHOW_QUESTION", {
          questionText: currentSession.currentQuestion,
          speakerIndex: initialSpeaker.index,
          speakerName: initialSpeaker.name,
        });
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [hasMicPermission, sceneLoadingState, sceneName, postToUnity]);

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
      handleStopInterview();
      return true;
    });
    return () => backHandler.remove();
  }, [handleStopInterview]);

  // Initiate the handshake on attachment, including when the Unity player survived exit
  useEffect(() => {
    if (!hasMicPermission || sceneLoadingState !== "idle" || isExitingRef.current) return;

    sceneLoadAttemptRef.current += 1;
    const attemptId = sceneLoadAttemptRef.current;
    console.log(`[Immersive] Initiating scene handshake for: ${sceneName} (attempt ${attemptId})`);
    setSceneLoadingState("loading");

    if (sceneLoadingTimerRef.current) {
      clearTimeout(sceneLoadingTimerRef.current);
    }
    sceneLoadingTimerRef.current = setTimeout(() => {
      if (sceneLoadAttemptRef.current === attemptId && !sceneLoadedRef.current && !isExitingRef.current) {
        console.warn(`[Immersive] Scene connection timed out after 20s for: ${sceneName} (attempt ${attemptId}, runtimeReady=${isUnityReadyRef.current}, sceneRequested=${hasRequestedSceneRef.current})`);
        // Keep waiting: only a matching SCENE_LOADED event can finish loading.
      }
    }, 20000);

    postToUnity("PING");
    requestSceneIfReady();
  }, [hasMicPermission, sceneLoadingState, sceneName, requestSceneIfReady, postToUnity]);

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
      if (isExitingRef.current) return;

      const currentSession = useInterviewStore.getState().session;
      if (!currentSession || (activeSessionIdRef.current && currentSession.sessionId !== activeSessionIdRef.current)) {
        console.log("[Immersive] Discarding Unity message for inactive/stale session");
        return;
      }

      const startListening = () => {
        if (isExitingRef.current || useInterviewStore.getState().session?.currentQuestionType === "closing") return;
        stateRef.current = "USER_LISTENING";
        audioHandoffRef.current.start();
        if (listeningSafetyTimerRef.current) clearTimeout(listeningSafetyTimerRef.current);
        // Unity owns the 60s recording maximum; this guard allows its stop/handoff to finish.
        listeningSafetyTimerRef.current = setTimeout(() => {
          if (stateRef.current === "USER_LISTENING" && !isExitingRef.current) postToUnity("STOP_RECORDING");
        }, 65000);
        postToUnity("START_RECORDING");
      };

      const raw = event.nativeEvent.message;
      // Payloads can contain sensitive transcripts; log event types only.

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
          requestSceneIfReady();
          break;
        }

        // ── Scene fully loaded ──────────────────────────────────────────────
        case "SCENE_LOADED": {
          // A retained player's startup event can precede our request.
          const wasRequested = hasRequestedSceneRef.current;
          confirmUnityRuntimeReady();
          if (!wasRequested) {
            requestSceneIfReady();
            break;
          }
          if (sceneLoadedRef.current) break;

          let loadedScene = "";
          try {
            const p = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
            loadedScene = typeof p?.sceneName === "string" ? p.sceneName : "";
          } catch {
            console.warn("[Immersive] Could not parse SCENE_LOADED payload:", msg.payload);
          }

          console.log(`[Immersive] SCENE_LOADED received: '${loadedScene}'. Target scene is '${sceneName}'.`);

          const isMatch =
            loadedScene && loadedScene.toLowerCase() === sceneName.toLowerCase();

          if (isMatch) {
            if (sceneLoadingTimerRef.current) {
              clearTimeout(sceneLoadingTimerRef.current);
              sceneLoadingTimerRef.current = null;
            }
            setSceneLoadingState("loaded");
            if (!sceneLoadedRef.current) {
              sceneLoadedRef.current = true;
              setSceneLoaded(true);
              console.log("[Immersive] Scene confirmed ready:", sceneName);
            }
          } else {
            console.warn(`[Immersive] Ignoring scene mismatch ('${loadedScene}' != '${sceneName}'); waiting for requested scene`);
          }
          break;
        }

        // ── TTS finished speaking the question → start listening for user answer ───
        case "QUESTION_SPOKEN": {
          if (isExitingRef.current) return;
          if (!sceneLoadedRef.current || stateRef.current !== "INTERVIEWER_SPEAKING") return;
          confirmUnityRuntimeReady();
          if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }
          if (sceneLoadingTimerRef.current) {
            clearTimeout(sceneLoadingTimerRef.current);
            sceneLoadingTimerRef.current = null;
          }
          setSceneLoadingState("loaded");
          setSceneLoaded(true);

          if (currentSession.currentQuestionType === "closing") {
            stateRef.current = "EXITING";
            audioHandoffRef.current.cancel();
            useInterviewStore.getState().completeClosing();
            AirisOrientation.lockPortrait();
            router.replace("/(student)/interview-session/summary" as any);
            break;
          }

          stateRef.current = "USER_LISTENING";
          console.log("[TIMING][VR] QUESTION_SPOKEN received → initiating START_RECORDING for candidate answer");
          startListening();

          break;
        }

        // ── Feedback TTS finished speaking → seamlessly transition to next question / follow-up ─────
        case "FEEDBACK_SPOKEN": {
          if (isExitingRef.current) return;
          setUnityReady(true);
          setSceneLoaded(true);

          if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
            feedbackTimeoutRef.current = null;
          }

          if (pendingNextQuestionRef.current) {
            const { question: nextQ, speaker } = pendingNextQuestionRef.current;
            pendingNextQuestionRef.current = null;
            currentSpeakerRef.current = speaker;
            stateRef.current = "INTERVIEWER_SPEAKING";
            console.log(`[VR][INTERVIEW_PROGRESSION] Feedback complete → presenting next question / follow-up: "${nextQ}" (speaker=${speaker.name})`);
            postToUnity("SHOW_QUESTION", {
              questionText: nextQ,
              speakerIndex: speaker.index,
              speakerName: speaker.name,
            });
          }
          break;
        }

        // ── Direct next question event ──────────────────────────────────────
        case "NEXT_QUESTION": {
          console.log("[TIMING][VR] NEXT_QUESTION event received");
          if (pendingNextQuestionRef.current && !isExitingRef.current) {
            const { question: nextQ, speaker } = pendingNextQuestionRef.current;
            pendingNextQuestionRef.current = null;
            currentSpeakerRef.current = speaker;
            stateRef.current = "INTERVIEWER_SPEAKING";
            console.log(`[VR][QUESTION_READY] question="${nextQ}" (speaker=${speaker.name})`);
            postToUnity("SHOW_QUESTION", {
              questionText: nextQ,
              speakerIndex: speaker.index,
              speakerName: speaker.name,
            });
          }
          break;
        }

        // ── Mic started (informational) ─────────────────────────────────────
        case "RECORDING_STARTED": {
          setUnityReady(true);
          setSceneLoaded(true);
          if (stateRef.current !== "USER_LISTENING") return;
          const startedPayload = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
          audioHandoffRef.current.confirmStarted(startedPayload?.captureId);
          console.log(`[TIMING][VR] RECORDING_STARTED confirmed by Unity (state=${stateRef.current})`);
          break;
        }

        case "NO_SPEECH": {
          const silencePayload = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
          if (!audioHandoffRef.current.matches(silencePayload?.captureId)) return;
          if (isExitingRef.current || currentSession.currentQuestionType === "closing" || !["USER_LISTENING", "WAITING_FOR_AUDIO"].includes(stateRef.current) || isProcessingAnswerRef.current) return;
          if (listeningSafetyTimerRef.current) {
            clearTimeout(listeningSafetyTimerRef.current);
            listeningSafetyTimerRef.current = null;
          }
          if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }
          console.log("[VR] Initial silence: no answer submitted; restarting listening");
          stateRef.current = "USER_LISTENING";
          startListening();
          break;
        }

        // ── Mic stopped (5s post-speech silence threshold reached) ──────────
        case "RECORDING_STOPPED": {
          const stoppedPayload = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
          if (!audioHandoffRef.current.matches(stoppedPayload?.captureId)) return;
          if (isExitingRef.current || stateRef.current !== "USER_LISTENING" || isProcessingAnswerRef.current) return;
          stateRef.current = "WAITING_FOR_AUDIO";
          if (listeningSafetyTimerRef.current) {
            clearTimeout(listeningSafetyTimerRef.current);
            listeningSafetyTimerRef.current = null;
          }
          recordingStoppedTimeRef.current = Date.now();
          console.log(`[TIMING][VR] RECORDING_STOPPED at ${new Date().toISOString()} (state=${stateRef.current})`);

          // Watchdog: If TRANSCRIPT_READY is not received within 20s, recover cleanly
          if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = setTimeout(() => {
            console.warn("[TIMING][VR] Watchdog timeout: No audio handoff received within 20s");
            if (!isExitingRef.current && stateRef.current === "WAITING_FOR_AUDIO") {
              startListening();
            }
          }, 20000);
          break;
        }

        // ── Audio saved → Transcribe via Daniel's backend & process ──────────
        case "TRANSCRIPT_READY": {
          if (isExitingRef.current || !["USER_LISTENING", "WAITING_FOR_AUDIO"].includes(stateRef.current)
              || isProcessingAnswerRef.current) return;
          let rawTranscript = "";
          let captureId: unknown;
          try {
            const payload = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
            rawTranscript = typeof payload?.transcript === "string" ? payload.transcript : "";
            captureId = payload?.captureId;
          } catch {
            console.warn("[Immersive] Invalid audio handoff payload");
            break;
          }
          const currentSession = useInterviewStore.getState().session;
          if (!currentSession || !currentUser || currentSession.currentQuestionType === "closing") break;
          const recordingGeneration = audioHandoffRef.current.accept(rawTranscript, captureId);
          if (recordingGeneration === null) return;
          isProcessingAnswerRef.current = true;
          stateRef.current = "PROCESSING_ANSWER";
          if (listeningSafetyTimerRef.current) clearTimeout(listeningSafetyTimerRef.current);
          if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
          listeningSafetyTimerRef.current = null;
          watchdogTimerRef.current = null;
          setUnityReady(true);
          setSceneLoaded(true);
          const isCurrentRecording = () => !isExitingRef.current && audioHandoffRef.current.isCurrent(recordingGeneration)
            && useInterviewStore.getState().session?.sessionId === currentSession.sessionId;

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

              const transcribeRes = await withTimeout(transcribeAudio(audioUri, "audio/wav"), 20000,
                "Transcription timed out. Please try your answer again.");
              console.log(`[VR][BACKEND_TRANSCRIPTION_COMPLETE] ms=${Date.now() - tStartTranscribe}`);

              finalTranscript = transcribeRes.transcription || "";
              pauseMetrics = transcribeRes.pauseMetrics;
            } else {
              console.log("[VR] Direct transcript received");
            }

            if (!isCurrentRecording()) return;

            // ═════════════════════════════════════════════════════════════════
            // 1. GLOBAL "STOP" VOICE COMMAND — EXIT ONLY, NEVER GRADED
            // ═════════════════════════════════════════════════════════════════
            const command = parseVRVoiceCommand(finalTranscript);
            if (command === "STOP") {
              console.log("[VR][VOICE_COMMAND] Action: STOP recognized — immediately exiting VR session");
              handleStopInterview();
              return;
            }

            // ═════════════════════════════════════════════════════════════════
            // 2. "REPEAT" VOICE COMMAND — REPEAT CURRENT QUESTION IMMEDIATELY
            // ═════════════════════════════════════════════════════════════════
            if (command === "REPEAT_QUESTION") {
              console.log(`[VR][VOICE_COMMAND] Action: REPEAT recognized — repeating "${currentSession.currentQuestion}"`);
              stateRef.current = "INTERVIEWER_SPEAKING";
              postToUnity("SHOW_QUESTION", {
                questionText: currentSession.currentQuestion,
                speakerIndex: currentSpeakerRef.current.index,
                speakerName: currentSpeakerRef.current.name,
              });
              return;
            }

            // ═════════════════════════════════════════════════════════════════
            // 3. "NEXT" / "NEXT QUESTION" / "SKIP" VOICE COMMAND
            // ═════════════════════════════════════════════════════════════════
            if (command === "NEXT_QUESTION") {
              console.log("[VR][VOICE_COMMAND] Candidate requested next question — submitting skip request to advance");
              finalTranscript = "skip this question";
            }

            // ═════════════════════════════════════════════════════════════════
            // 3. CANDIDATE INTERVIEW ANSWER HANDLING
            // ═════════════════════════════════════════════════════════════════
            const cleanedSpeech = finalTranscript.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            const isNonVerbal =
              cleanedSpeech.length < 2 ||
              cleanedSpeech === "thankyou" ||
              cleanedSpeech === "thanks" ||
              cleanedSpeech === "you" ||
              cleanedSpeech === "blankaudio" ||
              cleanedSpeech === "silence";

            if (isNonVerbal) {
              console.log("[VR] Empty/non-verbal transcript; retrying the same question");
              stateRef.current = "USER_LISTENING";
              startListening();
              return;
            }

            stateRef.current = "PROCESSING_ANSWER";
            const tStartEval = Date.now();
            console.log(`[VR][ANSWER_SUBMIT] length=${finalTranscript.length}`);
            console.log(`[TIMING][VR] Submitting answer to existing backend scoring endpoint...`);

            const abortController = new AbortController();
            activeAbortControllerRef.current = abortController;
            const evalTimeout = setTimeout(() => abortController.abort(), 30000);

            let response;
            try {
              response = await withTimeout(submitInterviewAnswer(
                {
                  targetRole: currentSession.targetRole,
                  program: currentSession.program,
                  parsedResume: getParsedResumeDict(),
                  history: currentSession.history,
                  currentQuestion: currentSession.currentQuestion,
                  currentAnswer: finalTranscript,
                  currentQuestionType: currentSession.currentQuestionType || "general",
                  currentBenchmarkAnswer: currentSession.currentBenchmarkAnswer || "",
                  totalQuestions: currentSession.totalQuestions,
                  pauseMetrics,
                },
                { signal: abortController.signal }
              ), 30000, "Evaluation timed out. Please retry the current answer.");
            } finally {
              clearTimeout(evalTimeout);
              abortController.abort();
              activeAbortControllerRef.current = null;
            }

            if (!isCurrentRecording()) {
              console.log("[VR] Exiting flag set during evaluation — discarding late result");
              return;
            }

            const evalMs = Date.now() - tStartEval;
            const totalTurnaroundMs = recordingStoppedTimeRef.current
              ? Date.now() - recordingStoppedTimeRef.current
              : evalMs;
            console.log(
              `[VR][AI_RESPONSE] score=${response.evaluation?.score} evalMs=${evalMs} totalMs=${totalTurnaroundMs}`
            );

            // Update Zustand store — authoritative state update
            if (!response.isComplete && !response.nextQuestion?.question?.trim()) {
              throw new Error("The next question is unavailable. Please retry this answer.");
            }
            const isInteraction = response.isInteractionEvent && command !== "NEXT_QUESTION";
            submitAnswer(
              finalTranscript,
              command === "NEXT_QUESTION" ? null : response.evaluation,
              response.nextQuestion?.question,
              response.nextQuestion?.questionType,
              response.nextQuestion?.benchmarkAnswer,
              response.isComplete,
              isInteraction
            );

            if (response.isComplete) {
              stateRef.current = "EXITING";
              console.log("[TIMING][VR] Interview complete — triggering END_INTERVIEW");
              postToUnity("END_INTERVIEW", {
                closingMessage:
                  "Thank you for completing your interview simulation with AIRIS. Your results are being prepared.",
              });
              setTimeout(() => {
                AirisOrientation.lockPortrait();
                router.push("/(student)/interview-session/summary" as any);
              }, 4000);
            } else if (isInteraction) {
              const followUpText = response.nextQuestion?.question || "Take your time. Whenever you are ready.";
              const speaker = currentSpeakerRef.current;
              stateRef.current = "INTERVIEWER_SPEAKING";
              console.log(`[VR][FOLLOW_UP] Interaction follow-up: "${followUpText}" (speaker=${speaker.name})`);
              const sendFollowUp = () => {
                if (isExitingRef.current) return;
                postToUnity("SHOW_QUESTION", {
                  questionText: followUpText,
                  speakerIndex: speaker.index,
                  speakerName: speaker.name,
                });
              };
              setTimeout(sendFollowUp, 350);
              if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
              watchdogTimerRef.current = setTimeout(() => {
                if (stateRef.current === "INTERVIEWER_SPEAKING" && !isExitingRef.current) {
                  console.warn("[VR] Follow-up progression watchdog timeout: Resending SHOW_QUESTION");
                  sendFollowUp();
                }
              }, 12000);
            } else {
              const nextQuestionText = response.nextQuestion?.question;
              const isFollowUp = response.nextQuestion?.isFollowUp || response.nextQuestion?.questionType === "follow-up";
              const nextSpeaker = isFollowUp
                ? currentSpeakerRef.current
                : getSpeakerForQuestion(
                    sceneName,
                    (currentSession.questionsAsked || 1) + 1
                  );

              if (nextQuestionText) {
                currentSpeakerRef.current = nextSpeaker;
                stateRef.current = "INTERVIEWER_SPEAKING";
                console.log(`[VR][NEXT_QUESTION] Showing next question directly: "${nextQuestionText}" (speaker=${nextSpeaker.name})`);
                const sendNextQ = () => {
                  if (isExitingRef.current) return;
                  postToUnity("SHOW_QUESTION", {
                    questionText: nextQuestionText,
                    speakerIndex: nextSpeaker.index,
                    speakerName: nextSpeaker.name,
                  });
                };
                setTimeout(sendNextQ, 350);
                if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
                watchdogTimerRef.current = setTimeout(() => {
                  if (stateRef.current === "INTERVIEWER_SPEAKING" && !isExitingRef.current) {
                    console.warn("[VR] Question progression watchdog timeout: Resending SHOW_QUESTION");
                    sendNextQ();
                  }
                }, 12000);
              } else {
                console.warn("[VR] No next question text received in response");
              }
            }
          } catch (error: any) {
            console.error("[TIMING][VR] Processing error:", error?.message || error);
            if (isCurrentRecording()) {
              stateRef.current = "INTERVIEWER_SPEAKING";
              // Retain current question prompt in the speech bubble; never replace with error text
              const questionToSpeak = currentSession?.currentQuestion || "";
              if (questionToSpeak) {
                postToUnity("SHOW_QUESTION", {
                  questionText: questionToSpeak,
                  speakerIndex: currentSpeakerRef.current.index,
                  speakerName: currentSpeakerRef.current.name,
                });
              } else {
                startListening();
              }
            }
          } finally {
            isProcessingAnswerRef.current = false;
          }
          break;
        }

        // ── Exit requested from Unity VR ────────────────────────────────────
        case "SESSION_EXIT": {
          console.log("[Immersive] SESSION_EXIT received from Unity VR");
          handleStopInterview();
          break;
        }

        default:
          break;
      }
    },
    [
      currentUser,
      postToUnity,
      sceneName,
      getParsedResumeDict,
      submitAnswer,
      router,
      confirmUnityRuntimeReady,
      handleStopInterview,
      requestSceneIfReady,
    ]
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

  // 1. Permission check in progress
  if (hasMicPermission === null) {
    return (
      <View style={styles.container}>
        <StatusBar hidden translucent backgroundColor="transparent" />
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#F4A47A" />
          <Text style={styles.overlayTitle}>Verifying Environment...</Text>
          <Text style={styles.overlaySubtitle}>Checking microphone access...</Text>
        </View>
      </View>
    );
  }

  // 2. Permission denied by user
  if (hasMicPermission === false) {
    return (
      <View style={styles.container}>
        <StatusBar hidden translucent backgroundColor="transparent" />
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>Microphone Permission Required</Text>
          <Text style={styles.overlaySubtitle}>
            AIRIS requires microphone access to detect your voice and process answers during the VR interview simulation.
          </Text>
          <View style={styles.permissionActionRow}>
            {isPermissionBlocked ? (
              <TouchableOpacity
                style={[styles.permissionBtn, styles.permissionBtnPrimary]}
                onPress={openMicrophoneSettings}
              >
                <Text style={styles.permissionBtnPrimaryText}>Open Settings</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.permissionBtn, styles.permissionBtnPrimary]}
                onPress={async () => {
                  const res = await requestMicrophonePermission();
                  if (res.granted) {
                    setHasMicPermission(true);
                  } else if (!res.canAskAgain || res.status === "blocked") {
                    setIsPermissionBlocked(true);
                  }
                }}
              >
                <Text style={styles.permissionBtnPrimaryText}>Grant Permission</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.permissionBtn, styles.permissionBtnSecondary]}
              onPress={handleStopInterview}
            >
              <Text style={styles.permissionBtnSecondaryText}>Exit Interview</Text>
            </TouchableOpacity>
          </View>
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
      {sceneLoadingState !== "loaded" && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#F4A47A" />
          <Text style={styles.overlayTitle}>Loading Interview Environment...</Text>
          <Text style={styles.overlaySubtitle}>
            {unityReady ? "Loading virtual scene..." : "Initialising VR runtime..."}
          </Text>
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
  permissionActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 12,
  },
  permissionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionBtnPrimary: {
    backgroundColor: "#F4A47A",
  },
  permissionBtnPrimaryText: {
    color: "#1F3A5F",
    fontWeight: "700",
    fontSize: 14,
  },
  permissionBtnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#BFD6EA",
  },
  permissionBtnSecondaryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
