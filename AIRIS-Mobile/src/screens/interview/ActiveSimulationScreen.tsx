import { rememberInterviewCompletion } from '../../services/firebase/pendingInterviewCompletion';
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Animated, Linking, Modal } from "react-native";
import { Text } from "../../components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useInterviewStore } from "../../store/interviewStore";
import { cancelInterviewSimulation, submitInterviewAnswer, transcribeAudio, PauseMetrics } from "../../services/api/interviewApi";
import { PrimaryButton, SecondaryButton, CaptureStatusPill } from "../../components/ui";
import * as Speech from "expo-speech";
import { SpeechDelivery } from "./speechDelivery";
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, RecordingPresets } from "expo-audio";
import { standardInterviewUiState, resolveSubmissionOutcome } from "./standardInterviewUi";
import { withTimeout } from "../../utils/promiseTimeout";

export default function ActiveSimulationScreen() {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [pulse] = useState(() => new Animated.Value(1));
  const mounted = useRef(true);
  const operation = useRef(0);
  const startingRecording = useRef(false);
  const stoppingRecording = useRef(false);
  const submittingRef = useRef(false);
  const speechDelivery = useRef(new SpeechDelivery());
  const speechAttempt = useRef(0);

  const currentUser = useAuthStore((state) => state.currentUser);
  const { session, submitAnswer, clearSession } = useInterviewStore();
  const ui = standardInterviewUiState({ recording: isRecording, transcribing: isTranscribing, evaluating: loading, error: recordingError, answer });

  useEffect(() => {
    if (!isRecording) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.16, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(1); };
  }, [isRecording, pulse]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      speechDelivery.current.cancel();
      operation.current += 1;
      Speech.stop();
    };
  }, []);

  const speakCurrentQuestion = useCallback(() => {
    if (!session) return;
    const revision = session.history.length;
    const delivery = speechDelivery.current.claim(`${session.sessionId}:${revision}:${speechAttempt.current}`);
    if (!delivery) return;
    setIsSpeaking(true);
    console.log(`[INTERVIEW][SPEECH_SENT] id=${delivery.utteranceId} turn=${session.questionsAsked}`);
    Speech.stop();
    Speech.speak(session.currentQuestion, {
      onDone: () => {
        const current = useInterviewStore.getState().session;
        if (!mounted.current || current?.sessionId !== session.sessionId || current.history.length !== revision || !speechDelivery.current.complete(delivery.utteranceId)) return;
        setIsSpeaking(false);
        console.log(`[INTERVIEW][SPEECH_COMPLETED] id=${delivery.utteranceId}`);
        if (session.currentQuestionType === "closing") {
          void (async () => {
            try { await withTimeout(rememberInterviewCompletion(session.userId, session.sessionId), 5000, 'Recovery storage timed out'); }
            catch { if (mounted.current) setRecordingError('Could not prepare result recovery. Tap the speaker to retry the closing.'); return; }
            if (!mounted.current || useInterviewStore.getState().session?.sessionId !== session.sessionId) return;
            useInterviewStore.getState().completeClosing();
            router.replace("/(student)/interview-session/summary" as any);
          })();
        }
      },
      onError: () => {
        const current = useInterviewStore.getState().session;
        if (mounted.current && current?.sessionId === session.sessionId && current.history.length === revision && speechDelivery.current.complete(delivery.utteranceId)) {
          setIsSpeaking(false);
          setRecordingError("Audio was unavailable. Tap the speaker to retry.");
        }
      },
    });
  }, [session, router]);

  useEffect(() => {
    if (session?.currentQuestionType === "closing") speakCurrentQuestion();
  }, [session?.currentQuestionType, speakCurrentQuestion]);

  const handleSpeak = () => {
    if (!session || (session.currentQuestionType === "closing" && isSpeaking)) return;
    if (isSpeaking) {
      speechDelivery.current.cancel();
      Speech.stop();
      setIsSpeaking(false);
    } else {
      speechAttempt.current += 1;
      speakCurrentQuestion();
    }
  };

  const [stopModalVisible, setStopModalVisible] = useState(false);

  const handleExit = () => {
    // 1. Immediately halt audio capture, playback, and cancel pending background operations
    speechDelivery.current.cancel();
    operation.current += 1;
    Speech.stop();
    if (audioRecorder.isRecording) void audioRecorder.stop().catch(() => undefined);

    // Synchronously restore UI to a clean, usable state so pending work does not leave controls stuck
    setIsRecording(false);
    setIsSpeaking(false);
    setIsTranscribing(false);
    setLoading(false);
    submittingRef.current = false;
    startingRecording.current = false;
    stoppingRecording.current = false;

    setStopModalVisible(true);
  };

  const confirmExitWithoutScore = () => {
    setStopModalVisible(false);
    const cancellingSession = useInterviewStore.getState().session;
    if (cancellingSession) void cancelInterviewSimulation(cancellingSession.sessionId).catch(() => { console.warn("Server cancellation could not be confirmed; the unfinished session will expire."); });
    clearSession();
    router.replace("/(student)/(tabs)/interview" as any);
  };

  const handleRetrySession = () => {
    setStopModalVisible(false);
    // Keep the current interview session alive, ensuring controls are unlocked for candidate retry
    setLoading(false);
    setIsTranscribing(false);
    setIsRecording(false);
    submittingRef.current = false;
    if (session?.currentQuestionType === "closing") {
      speechAttempt.current += 1;
      speakCurrentQuestion();
    }
  };

  const startRecording = async () => {
    if (useInterviewStore.getState().session?.currentQuestionType === "closing") return;
    if (isRecording || isTranscribing || loading || startingRecording.current) return;
    startingRecording.current = true;
    const requestId = operation.current;
    setRecordingError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!mounted.current || requestId !== operation.current) return;
      if (permission.granted) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await audioRecorder.prepareToRecordAsync();
        if (!mounted.current || requestId !== operation.current) return;
        audioRecorder.record();
        if (mounted.current) setIsRecording(true);
      } else {
        setRecordingError("Microphone permission is required to answer.");
        Alert.alert("Permission Required", "Enable microphone access to answer by voice.", permission.canAskAgain ? [{ text: "OK" }] : [{ text: "Cancel" }, { text: "Settings", onPress: () => void Linking.openSettings() }]);
      }
    } catch (err) {
      console.error("Failed to start recording", err);
      if (mounted.current) setRecordingError("Could not start recording. Please try again.");
    } finally {
      startingRecording.current = false;
    }
  };

  const [lastPauseMetrics, setLastPauseMetrics] = useState<PauseMetrics | undefined>(undefined);

  const stopRecording = async () => {
    if (!isRecording || stoppingRecording.current) return;
    stoppingRecording.current = true;
    const requestId = ++operation.current;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        const { transcription, pauseMetrics } = await withTimeout(
          transcribeAudio(uri, "audio/m4a", session ? { sessionId: session.sessionId, turn: session.history.length } : undefined),
          60000,
          "Transcription is taking too long. Please record your answer again."
        );
        if (!mounted.current || requestId !== operation.current) return;
        if (!transcription.trim()) {
          setRecordingError("No speech was detected. Please record your answer again.");
          return;
        }
        setAnswer((prev) => (prev ? prev + " " + transcription : transcription));
        if (pauseMetrics) {
          setLastPauseMetrics(pauseMetrics);
        }
      } else {
        if (mounted.current && requestId === operation.current) setRecordingError("No recording was saved. Please try again.");
      }
    } catch (error: any) {
      console.error("Transcription failed", error);
      if (mounted.current && requestId === operation.current) {
        setRecordingError(error?.message || "Transcription failed. Please record your answer again.");
      }
    } finally {
      stoppingRecording.current = false;
      if (mounted.current && requestId === operation.current) setIsTranscribing(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleSubmit = async () => {
    if (useInterviewStore.getState().session?.currentQuestionType === "closing") return;
    // Synchronous guard: two rapid taps must not create duplicate submissions.
    if (submittingRef.current) return;
    if (loading || isRecording || isTranscribing) return;
    if (!answer.trim()) {
      setRecordingError("Record an answer before continuing.");
      return;
    }

    if (!session || !currentUser) {
      setRecordingError("Your interview data is missing. Go back and start a new interview.");
      return;
    }

    submittingRef.current = true;
    const requestId = ++operation.current;
    setLoading(true);
    setRecordingError(null);
    try {
      const response = await withTimeout(
        submitInterviewAnswer({
          sessionId: session.sessionId,
          questionId: `survey-${session.questionsAsked}`,
          turn: session.history.length,
          currentAnswer: answer.trim(),
        }),
        45000,
        "Evaluation is taking too long. Your answer is saved here — please try again."
      );

      if (!mounted.current || requestId !== operation.current) return;

      if (response.cancelled) { confirmExitWithoutScore(); return; }
      if (isSpeaking) Speech.stop();

      const outcome = resolveSubmissionOutcome(response);
      if (outcome.kind === "retry") {
        setRecordingError(outcome.error);
        return;
      }

      if (!response.isInteractionEvent && !Number.isFinite(response.evaluation?.overall)) {
        throw new Error("Answer evaluation is unavailable. Please retry this answer.");
      }
      const accepted = submitAnswer(
        answer.trim(),
        response.evaluation,
        outcome.kind === "advance" ? outcome.question : undefined,
        outcome.kind === "advance" ? outcome.questionType : undefined,
        outcome.kind === "advance" ? outcome.benchmark : undefined,
        outcome.kind === "complete",
        response.isInteractionEvent,
        { sessionId: session.sessionId, historyLength: session.history.length },
        lastPauseMetrics
      );

      if (!accepted) throw new Error("The interview changed while processing. Your answer is still here; please review the current question.");
      setAnswer("");
      setLastPauseMetrics(undefined);
      setIsSpeaking(false);

      if (outcome.kind === "complete") {
        router.push("/(student)/interview-session/summary" as any);
      }
    } catch (error: any) {
      console.error(error);
      if (mounted.current && requestId === operation.current) {
        setRecordingError(
          error?.message || "Submission failed. Your transcript is still here; please try again."
        );
      }
    } finally {
      if (mounted.current && requestId === operation.current) {
        setLoading(false);
        submittingRef.current = false;
      }
    }
  };

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] items-center justify-center">
        <Text className="text-[#1F3A5F]">Session lost. Please restart.</Text>
        <PrimaryButton title="Go Back" onPress={() => router.replace("/(student)/(tabs)/interview" as any)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB]" edges={["top", "bottom"]}>
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-[#EAF2F7] bg-white z-10" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
           <TouchableOpacity onPress={handleExit} accessibilityLabel="Stop interview">
              <Ionicons name="close" size={28} color="#1F3A5F" />
           </TouchableOpacity>
           <View className="items-center">
             <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider">Interview Active</Text>
             <Text className="text-base font-extrabold text-[#1F3A5F]">Question {session.questionsAsked}</Text>
           </View>
           <View className="w-7" />
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>

          <View className="flex-row items-start mb-6">
            <View className="h-10 w-10 bg-[#1F3A5F] rounded-full items-center justify-center mr-4 mt-1 border-2 border-white shadow-sm">
              <Ionicons name="person" size={20} color="white" />
            </View>
            <View className="flex-1 bg-white p-5 rounded-2xl rounded-tl-none border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
               <View className="flex-row items-center justify-between mb-2">
                 <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-wider">Interviewer</Text>
                 <TouchableOpacity onPress={handleSpeak} accessibilityLabel="Repeat question" className="h-10 w-10 rounded-full bg-[#F4F8FB] items-center justify-center border border-[#BFD6EA]">
                   <Ionicons name={isSpeaking ? "volume-mute" : "volume-high"} size={16} color="#CA5D25" />
                 </TouchableOpacity>
               </View>
               <Text className="text-lg font-bold text-[#1F3A5F] leading-7">
                 {session.currentQuestion}
               </Text>
            </View>
          </View>

          {session.currentQuestionType !== "closing" && <View className="items-center rounded-2xl border border-[#BFD6EA] bg-white p-5 mb-6">
            <CaptureStatusPill
              status={
                ui.phase === "recording"
                  ? "listening"
                  : ui.phase === "processing"
                    ? "processing"
                    : ui.phase === "error"
                      ? "error"
                      : answer.trim()
                        ? "ready"
                        : "idle"
              }
              label={
                ui.phase === "idle" && answer.trim()
                  ? "Answer ready — tap Next Question"
                  : ui.label
              }
            />
            <View className="h-28 w-28 items-center justify-center mt-2">
              {ui.showPulse && <Animated.View className="absolute h-24 w-24 rounded-full bg-[#F4A47A]/30" style={{ transform: [{ scale: pulse }] }} />}
              <TouchableOpacity
                onPress={toggleRecording}
                disabled={loading || isTranscribing}
                accessibilityRole="button"
                accessibilityLabel={isRecording ? "Stop recording" : "Record answer"}
                className={`h-20 w-20 items-center justify-center rounded-full ${isRecording ? "bg-[#CA5D25]" : "bg-[#1F3A5F]"}`}
              >
                {isTranscribing ? <ActivityIndicator color="white" /> : <Ionicons name={isRecording ? "stop" : "mic"} size={32} color="white" />}
              </TouchableOpacity>
            </View>
            {recordingError && <Text className="text-sm text-[#B91C1C] text-center mt-2" accessibilityRole="alert">{recordingError}</Text>}
            {answer.trim() ? <Text className="text-sm leading-6 text-[#4F6B82] mt-4 self-stretch">Your response: {answer}</Text> : null}
          </View>}

        </ScrollView>

        {session.currentQuestionType !== "closing" ? <View className="p-6 bg-white border-t border-[#EAF2F7]">
          {loading ? (
            <View className="h-14 items-center justify-center flex-row rounded-full bg-[#F4F8FB] border border-[#BFD6EA]">
              <ActivityIndicator size="small" color="#CA5D25" />
              <Text className="ml-3 font-bold text-[#4F6B82]">Analyzing response...</Text>
            </View>
          ) : (
            <View>
              <PrimaryButton
                title={session.questionsAsked >= session.totalQuestions ? "Finish Interview" : "Next Question"}
                variant="orange"
                onPress={handleSubmit}
                disabled={!ui.canContinue}
              />
              {!ui.canContinue ? (
                <Text className="text-xs text-center text-[#4F6B82] mt-2">
                  {!answer.trim()
                    ? "Record your answer with the microphone first."
                    : "Please wait — finishing up before you continue."}
                </Text>
              ) : null}
            </View>
          )}
        </View> : <View className="p-6 bg-white"><Text className="text-center text-[#4F6B82]">{recordingError || "The interviewer is closing the session. Your results will follow."}</Text></View>}
      </View>

      <Modal
        visible={stopModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStopModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 }}>
            <View className="h-14 w-14 rounded-full bg-[#CA5D25]/10 items-center justify-center self-center mb-4">
              <Ionicons name="alert-circle" size={32} color="#CA5D25" />
            </View>
            <Text className="text-xl font-bold text-[#1F3A5F] text-center mb-2">
              {session?.evaluations.length === 9 ? "Stop interview?" : "Insufficient Interview Evidence"}
            </Text>
            <Text className="text-sm text-[#4F6B82] text-center leading-5 mb-6">
              You have completed {session?.evaluations?.length || 0} of 9 evaluated questions. Stopping cancels this interview without a completed report or score. Choose Continue Interview to finish the approved workflow.
            </Text>
            <View className="gap-3">
              <PrimaryButton
                title="Continue Interview"
                variant="orange"
                onPress={handleRetrySession}
              />
              <SecondaryButton
                title="Exit Without Score"
                onPress={confirmExitWithoutScore}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
