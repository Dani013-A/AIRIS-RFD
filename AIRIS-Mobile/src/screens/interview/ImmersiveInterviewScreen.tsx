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

// ── State safety types ──────────────────────────────────────────────────────
type VRInterviewState =
  | "INTERVIEWER_SPEAKING"
  | "USER_LISTENING"
  | "PROCESSING_ANSWER"
  | "INTERVIEWER_FEEDBACK"
  | "WAITING_FOR_NEXT_QUESTION_COMMAND"
  | "EXITING";

function parseVRVoiceCommand(
  transcript: string
): "STOP" | "NEXT_QUESTION" | null {
  const clean = transcript
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  // 1. Explicit termination / exit commands
  const explicitStopPhrases = [
    "stop",
    "stop interview",
    "stop the interview",
    "end interview",
    "end the interview",
    "quit",
    "quit interview",
    "exit",
    "exit interview",
    "cancel interview",
    "terminate interview",
    "stop please",
    "please stop",
  ];

  for (const phrase of explicitStopPhrases) {
    if (clean === phrase) {
      return "STOP";
    }
  }

  // 2. Explicit advancement / skip commands
  const explicitNextPhrases = [
    "next",
    "next question",
    "go to next question",
    "go to next",
    "next one",
    "next please",
    "please next",
    "skip",
    "skip question",
    "skip this question",
    "pass",
    "continue",
    "proceed",
    "move on",
  ];

  for (const phrase of explicitNextPhrases) {
    if (clean === phrase) {
      return "NEXT_QUESTION";
    }
  }

  // Bounded 1-2 word match for clear commands
  const tokens = clean.split(" ");
  if (tokens.length <= 2) {
    if (tokens.includes("stop") || tokens.includes("exit") || tokens.includes("quit")) {
      return "STOP";
    }
    if (tokens.includes("next") || tokens.includes("skip") || tokens.includes("pass")) {
      return "NEXT_QUESTION";
    }
  }

  return null;
}

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
  const pendingNextQuestionRef = useRef<{ question: string; speaker: VRSpeaker } | null>(null);
  const currentSpeakerRef = useRef<VRSpeaker>({ index: 1, name: "Claudia" });

  // State machine ref & idempotency guards
  const stateRef = useRef<VRInterviewState>("INTERVIEWER_SPEAKING");
  const isExitingRef = useRef(false);
  const isProcessingAnswerRef = useRef(false);

  // Deterministic lifecycle refs
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
    isExitingRef.current = false;
    isProcessingAnswerRef.current = false;
    stateRef.current = "INTERVIEWER_SPEAKING";

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
    stateRef.current = "EXITING";
    console.log("[VR][VOICE_COMMAND] Action: STOP — Terminating immersive VR interview");

    if (activeAbortControllerRef.current) {
      try {
        activeAbortControllerRef.current.abort();
      } catch {}
      activeAbortControllerRef.current = null;
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

    AirisOrientation.lockPortrait();
    console.log("[VR][VOICE_COMMAND] STOP is an exit command — restoring portrait and returning to interview onboarding flow");
    router.replace("/(student)/(tabs)/interview" as any);
  }, [postToUnity, router]);

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
      stateRef.current = "INTERVIEWER_SPEAKING";
      const initialSpeaker = getSpeakerForQuestion(sceneName, session.questionsAsked || 1);
      currentSpeakerRef.current = initialSpeaker;
      console.log(`[VR][QUESTION_CONTEXT] targetRole="${session.targetRole}" program="${session.program}" resumeId="${session.resumeId}"`);
      console.log(`[VR][QUESTION_READY] question="${session.currentQuestion}" (speaker=${initialSpeaker.name})`);
      console.log("[TIMING][VR] Scheduling initial SHOW_QUESTION (1600ms after sceneLoaded):", session.currentQuestion);
      const timer = setTimeout(() => {
        postToUnity("SHOW_QUESTION", {
          questionText: session.currentQuestion,
          speakerIndex: initialSpeaker.index,
          speakerName: initialSpeaker.name,
        });
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [sceneLoaded, session?.currentQuestion, session?.questionsAsked, sceneName, postToUnity]);

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

  // Initiate scene synchronization for warm UnityPlayer re-entry (or initial handshake)
  useEffect(() => {
    if (!sceneLoadedRef.current && !hasRequestedSceneRef.current) {
      hasRequestedSceneRef.current = true;
      console.log("[Immersive] Initiating scene sync for:", sceneName);
      postToUnity("LOAD_SCENE", { sceneName });
    }
  }, [sceneName, postToUnity]);

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

        // ── TTS finished speaking the question → start listening for user answer ───
        case "QUESTION_SPOKEN": {
          if (isExitingRef.current) return;
          setUnityReady(true);
          setSceneLoaded(true);
          stateRef.current = "USER_LISTENING";
          console.log("[TIMING][VR] QUESTION_SPOKEN received → initiating START_RECORDING for candidate answer");
          postToUnity("START_RECORDING");
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
          console.log(`[TIMING][VR] RECORDING_STARTED confirmed by Unity (state=${stateRef.current})`);
          break;
        }

        // ── Mic stopped (5s post-speech silence threshold reached) ──────────
        case "RECORDING_STOPPED": {
          if (isExitingRef.current) return;
          setIsProcessing(true);
          recordingStoppedTimeRef.current = Date.now();
          console.log(`[TIMING][VR] RECORDING_STOPPED at ${new Date().toISOString()} (state=${stateRef.current})`);

          // Watchdog: If TRANSCRIPT_READY is not received within 20s, recover cleanly
          if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = setTimeout(() => {
            console.warn("[TIMING][VR] Watchdog timeout: No audio handoff received within 20s");
            setIsProcessing(false);
            if (!isExitingRef.current) {
              stateRef.current = "USER_LISTENING";
              postToUnity("START_RECORDING");
            }
          }, 20000);
          break;
        }

        // ── Audio saved → Transcribe via Daniel's backend & process ──────────
        case "TRANSCRIPT_READY": {
          if (isExitingRef.current) return;
          if (isProcessingAnswerRef.current) {
            console.log("[VR] Ignoring duplicate TRANSCRIPT_READY message");
            return;
          }
          isProcessingAnswerRef.current = true;

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

          const currentSession = useInterviewStore.getState().session;
          if (!currentSession || !currentUser) {
            setIsProcessing(false);
            isProcessingAnswerRef.current = false;
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

              finalTranscript = transcribeRes.transcription || "";
              pauseMetrics = transcribeRes.pauseMetrics;
            } else {
              console.log(`[TIMING][VR] Received direct text transcript: "${finalTranscript}"`);
            }

            if (isExitingRef.current) return;

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
            // 2. "NEXT" / "NEXT QUESTION" / "SKIP" VOICE COMMAND
            // ═════════════════════════════════════════════════════════════════
            if (command === "NEXT_QUESTION") {
              if (pendingNextQuestionRef.current) {
                const { question: nextQ, speaker } = pendingNextQuestionRef.current;
                pendingNextQuestionRef.current = null;
                currentSpeakerRef.current = speaker;
                stateRef.current = "INTERVIEWER_SPEAKING";
                console.log(`[VR][VOICE_COMMAND] Action: NEXT_QUESTION confirmed → advancing to: "${nextQ}" (speaker=${speaker.name})`);
                postToUnity("SHOW_QUESTION", {
                  questionText: nextQ,
                  speakerIndex: speaker.index,
                  speakerName: speaker.name,
                });
                return;
              } else {
                console.log("[VR][VOICE_COMMAND] Candidate requested next question — submitting skip request to advance");
                finalTranscript = "I would like to move on to the next question.";
              }
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
              console.log(`[VR] Initial silence / non-verbal ambient noise ("${finalTranscript}") — remaining in listening state for candidate`);
              stateRef.current = "USER_LISTENING";
              postToUnity("START_RECORDING");
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
              response = await submitInterviewAnswer(
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
              );
            } finally {
              clearTimeout(evalTimeout);
              activeAbortControllerRef.current = null;
            }

            if (isExitingRef.current) {
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
            } else if (response.isInteractionEvent) {
              const followUpText = response.nextQuestion?.question || "Take your time. Whenever you are ready.";
              const speaker = currentSpeakerRef.current;
              stateRef.current = "INTERVIEWER_SPEAKING";
              console.log(`[VR][FOLLOW_UP] Interaction follow-up: "${followUpText}" (speaker=${speaker.name})`);
              postToUnity("SHOW_QUESTION", {
                questionText: followUpText,
                speakerIndex: speaker.index,
                speakerName: speaker.name,
              });
            } else {
              const nextQuestionText = response.nextQuestion?.question;
              const feedbackText = response.evaluation?.feedback;
              const nextSpeaker = getSpeakerForQuestion(
                sceneName,
                (currentSession.questionsAsked || 1) + 1
              );

              if (command === "NEXT_QUESTION" && nextQuestionText) {
                currentSpeakerRef.current = nextSpeaker;
                stateRef.current = "INTERVIEWER_SPEAKING";
                console.log(`[VR][NEXT_QUESTION] Candidate requested NEXT → presenting next question directly: "${nextQuestionText}" (speaker=${nextSpeaker.name})`);
                postToUnity("SHOW_QUESTION", {
                  questionText: nextQuestionText,
                  speakerIndex: nextSpeaker.index,
                  speakerName: nextSpeaker.name,
                });
              } else if (feedbackText && nextQuestionText) {
                // Stage the next question / follow-up with nextSpeaker, speak constructive feedback with current speaker, then transition automatically
                pendingNextQuestionRef.current = { question: nextQuestionText, speaker: nextSpeaker };
                stateRef.current = "INTERVIEWER_FEEDBACK";
                console.log(`[VR][AI_FEEDBACK] Speaking feedback with current speaker (${currentSpeakerRef.current.name}): "${feedbackText}"`);
                postToUnity("SHOW_FEEDBACK", {
                  feedback: feedbackText,
                  speakerIndex: currentSpeakerRef.current.index,
                  score: response.evaluation?.score ?? 0,
                });

                // Safety fallback: if FEEDBACK_SPOKEN takes longer than 7s, advance automatically
                if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
                feedbackTimeoutRef.current = setTimeout(() => {
                  if (pendingNextQuestionRef.current && !isExitingRef.current) {
                    const fallbackNextQ = pendingNextQuestionRef.current.question;
                    const fallbackSpeaker = pendingNextQuestionRef.current.speaker || nextSpeaker;
                    pendingNextQuestionRef.current = null;
                    currentSpeakerRef.current = fallbackSpeaker;
                    stateRef.current = "INTERVIEWER_SPEAKING";
                    console.log(`[VR][WATCHDOG] Feedback timeout → auto-advancing to: "${fallbackNextQ}" (speaker=${fallbackSpeaker.name})`);
                    postToUnity("SHOW_QUESTION", {
                      questionText: fallbackNextQ,
                      speakerIndex: fallbackSpeaker.index,
                      speakerName: fallbackSpeaker.name,
                    });
                  }
                }, 7000);
              } else if (nextQuestionText) {
                currentSpeakerRef.current = nextSpeaker;
                stateRef.current = "INTERVIEWER_SPEAKING";
                console.log(`[VR][NEXT_QUESTION] Showing next question directly: "${nextQuestionText}" (speaker=${nextSpeaker.name})`);
                postToUnity("SHOW_QUESTION", {
                  questionText: nextQuestionText,
                  speakerIndex: nextSpeaker.index,
                  speakerName: nextSpeaker.name,
                });
              }
            }
          } catch (error: any) {
            console.error("[TIMING][VR] Processing error:", error?.message || error);
            if (!isExitingRef.current) {
              stateRef.current = "USER_LISTENING";
              postToUnity("SHOW_QUESTION", {
                questionText: "There was an issue evaluating your response. Please speak your answer again.",
                speakerIndex: currentSpeakerRef.current.index,
                speakerName: currentSpeakerRef.current.name,
              });
            }
          } finally {
            setIsProcessing(false);
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