import React, { useEffect, useRef, useState } from "react";
import { View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Animated, Linking } from "react-native";
import { Text } from "../../components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";
import { submitInterviewAnswer, transcribeAudio, PauseMetrics } from "../../services/api/interviewApi";
import { PrimaryButton, CaptureStatusPill } from "../../components/ui";
import * as Speech from "expo-speech";
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

  const currentUser = useAuthStore((state) => state.currentUser);
  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);
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
      operation.current += 1;
      Speech.stop();
    };
  }, []);

  const handleSpeak = () => {
    if (!session) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(session.currentQuestion, {
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleExit = () => {
    operation.current += 1;
    Speech.stop();
    if (audioRecorder.isRecording) void audioRecorder.stop().catch(() => undefined);
    setIsRecording(false);
    clearSession();
    router.replace("/(student)/(tabs)/interview" as any);
  };

  const startRecording = async () => {
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
          transcribeAudio(uri, "audio/m4a"),
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
    // Synchronous guard: two rapid taps must not create duplicate submissions.
    if (submittingRef.current) return;
    if (loading || isRecording || isTranscribing) return;
    if (!answer.trim()) {
      setRecordingError("Record an answer before continuing.");
      return;
    }

    if (!session || !currentUser || !activeAnalysis) {
      setRecordingError("Your interview data is missing. Go back and start a new interview.");
      return;
    }

    submittingRef.current = true;
    const requestId = ++operation.current;
    setLoading(true);
    setRecordingError(null);
    try {
      const parsedResumeDict: Record<string, string> = {};
      if (Array.isArray(activeAnalysis.parsedSections)) {
        for (const sec of activeAnalysis.parsedSections) {
          parsedResumeDict[sec.name] = sec.content;
        }
      } else {
        Object.assign(parsedResumeDict, activeAnalysis.parsedSections || {});
      }

      const response = await withTimeout(
        submitInterviewAnswer({
          targetRole: session.targetRole,
          program: session.program,
          parsedResume: parsedResumeDict,
          history: session.history,
          currentQuestion: session.currentQuestion,
          currentAnswer: answer.trim(),
          currentQuestionType: session.currentQuestionType,
          totalQuestions: session.totalQuestions,
          pauseMetrics: lastPauseMetrics,
        }),
        45000,
        "Evaluation is taking too long. Your answer is saved here — please try again."
      );

      if (!mounted.current || requestId !== operation.current) return;

      if (isSpeaking) Speech.stop();

      const outcome = resolveSubmissionOutcome(response);
      if (outcome.kind === "retry") {
        setRecordingError(outcome.error);
        return;
      }

      submitAnswer(
        answer.trim(),
        response.evaluation,
        outcome.kind === "advance" ? outcome.question : undefined,
        outcome.kind === "advance" ? outcome.questionType : undefined,
        outcome.kind === "advance" ? outcome.benchmark : undefined,
        outcome.kind === "complete",
        response.isInteractionEvent
      );

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

          <View className="items-center rounded-2xl border border-[#BFD6EA] bg-white p-5 mb-6">
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
          </View>

        </ScrollView>

        <View className="p-6 bg-white border-t border-[#EAF2F7]">
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
        </View>
      </View>
    </SafeAreaView>
  );
}
