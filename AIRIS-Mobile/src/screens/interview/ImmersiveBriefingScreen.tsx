import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "../../components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";
import { startInterviewSimulation } from "../../services/api/interviewApi";
import { PrimaryButton } from "../../components/ui";
import { normalizeApiError } from "../../utils/errorMapper";
import AirisOrientation from "../../utils/AirisOrientation";
import { requestMicrophonePermission, openMicrophoneSettings } from "../../utils/audioPermission";

/**
 * ImmersiveBriefingScreen
 *
 * Pre-flight screen for the Immersive (Unity) interview flow.
 * Mirrors the existing PreSimulationBriefingScreen but is tailored for VR:
 *  - Microphone is handled by Unity, not Expo AV
 *  - Calls startInterviewSimulation() (same as Standard mode) to seed the
 *    Zustand interviewStore with the session and first question.
 *  - Navigates to immersive-active on "Start".
 *
 * The interviewType in the store ("immersive-one-on-one" | "immersive-panel")
 * is set by ExperienceSelectionScreen before navigating here.
 */
export default function ImmersiveBriefingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.currentUser);
  const activeResume = useResumeStore((s) => s.activeResume);
  const activeAnalysis = useResumeStore((s) => s.activeAnalysis);
  const { initializeSession, session, clearSession } = useInterviewStore();

  useEffect(() => {
    // Kick off session initialisation as soon as the screen mounts
    startSetup();
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const { hasResume, activeResume: resObj, activeAnalysis: analObj } =
        await useResumeStore.getState().ensureResumeHydrated();
      const user = useAuthStore.getState().currentUser;

      if (!user) {
        setError("Please log in and try again.");
        return;
      }

      if (!hasResume || !resObj || !analObj) {
        setError("Resume or profile data is missing. Please upload a resume and try again.");
        return;
      }

      // Build the same parsedResume dict that ActiveSimulationScreen builds
      const parsedResumeDict: Record<string, string> = {};
      if (Array.isArray(analObj.parsedSections)) {
        for (const sec of analObj.parsedSections) {
          parsedResumeDict[sec.name] = sec.content;
        }
      } else {
        Object.assign(parsedResumeDict, analObj.parsedSections || {});
      }

      // Detect the interview type stored by ExperienceSelectionScreen
      // so we can pass it to initializeSession
      const pendingType = useInterviewStore.getState().session?.interviewType;
      const interviewType: "one-on-one" | "panel" =
        pendingType === "immersive-panel" ? "panel" : "one-on-one";

      // ── Daniel's existing API call (unchanged) ───────────────────────────────
      const response = await startInterviewSimulation({
        targetRole: user.targetPosition || "Unknown Role",
        program: user.degreeProgram || "Unknown Program",
        parsedResume: parsedResumeDict,
        resumeId: user.activeResumeId || "none",
        interviewType: interviewType,
      });

      console.log("[VR][QUESTION_READY]");

      // Seed Zustand store — same initializeSession() the Standard flow uses
      initializeSession({
        sessionId: response.sessionId,
        userId: user.uid,
        targetRole: user.targetPosition,
        program: user.degreeProgram,
        resumeId: user.activeResumeId || "none",
        interviewType,
        firstQuestion: response.question,
        firstQuestionType: response.questionType,
        firstQuestionBenchmark: response.benchmarkAnswer,
        totalQuestions: 10,
      });
    } catch (err) {
      console.error("[ImmersiveBriefing] startSetup error:", err);
      const normalized = normalizeApiError(err, "Failed to initialise interview session. Please try again.");
      setError(normalized.userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] items-center justify-center px-6">
        <Ionicons name="alert-circle" size={48} color="#e53e3e" />
        <Text className="text-[#1F3A5F] font-bold text-lg mt-4 text-center">Initialisation Error</Text>
        <Text className="text-[#4F6B82] text-sm text-center mt-2 font-medium mb-6">{error}</Text>
        <PrimaryButton title="Go Back" onPress={() => router.back()} />
        <TouchableOpacity onPress={startSetup} className="mt-4">
          <Text className="text-[#CA5D25] font-bold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading || !session) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] items-center justify-center px-6">
        <ActivityIndicator size="large" color="#F4A47A" />
        <Text className="text-[#1F3A5F] font-bold text-lg mt-6">Preparing Interview...</Text>
        <Text className="text-[#4F6B82] text-sm text-center mt-2 font-medium">
          Reviewing your resume and generating targeted questions.
        </Text>
      </SafeAreaView>
    );
  }

  const isPanel = session.interviewType === "panel" || (session.interviewType as string) === "immersive-panel";

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "bottom"]}>
      <View className="py-4">
        <TouchableOpacity onPress={() => { clearSession(); router.back(); }} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={24} color="#1F3A5F" />
          <Text className="text-[#1F3A5F] font-bold ml-2">Exit</Text>
        </TouchableOpacity>
        <Text className="text-xs font-bold text-[#CA5D25] uppercase tracking-wider mb-1">
          Immersive VR Interview
        </Text>
        <Text className="text-3xl font-extrabold text-[#1F3A5F]">Before You Start</Text>
      </View>

      <ScrollView className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
        {/* Interview Type Badge */}
        <View className="flex-row items-center bg-[#1F3A5F] px-4 py-2 rounded-full self-start mb-5">
          <Ionicons name={isPanel ? "people" : "person"} size={16} color="white" />
          <Text className="text-white font-bold text-xs ml-2 uppercase tracking-wider">
            {isPanel ? "Panel Interview — 3 Interviewers" : "One-on-One Interview"}
          </Text>
        </View>

        {/* Recording Disclosure Card */}
        <View
          className="bg-[#FEF5F1] border border-[#F4A47A] p-5 rounded-3xl mb-5 flex-row items-start"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
          <Ionicons name="mic" size={22} color="#CA5D25" style={{ marginTop: 2, marginRight: 12 }} />
          <View className="flex-1">
            <Text className="text-xs font-bold text-[#CA5D25] uppercase tracking-wider mb-1">Recording Disclosure</Text>
            <Text className="text-xs font-medium text-[#1F3A5F] leading-5">
              Your answers will be recorded so AIRIS can transcribe and evaluate your interview responses. Use a quiet place and speak clearly. Your microphone is active only during the answer portion of the interview.
            </Text>
          </View>
        </View>

        {/* VR Environment Guidance */}
        <View
          className="bg-white p-6 rounded-3xl border border-[#BFD6EA] mb-5"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="headset-outline" size={22} color="#1F3A5F" />
            <Text className="text-base font-bold text-[#1F3A5F] ml-2">VR Environment Guidance</Text>
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium mb-4">
            You will enter a virtual office. The interviewer reads each question out loud, and your spoken answer is recorded by itself. You do not need to tap any buttons.
          </Text>

          <View className="gap-2.5 mb-4">
            {[
              "Find a quiet location before starting",
              "Speak clearly and at a natural pace",
              "Allow microphone access when your phone asks for it",
              "Wait for the interviewer to finish speaking before you begin your answer",
              "Remain in the environment until the simulation ends",
            ].map((tip, idx) => (
              <View key={idx} className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={18} color="#79D5C8" style={{ marginTop: 2, marginRight: 8 }} />
                <Text className="flex-1 text-sm font-medium text-[#1F3A5F] leading-5">{tip}</Text>
              </View>
            ))}
          </View>

          <View className="bg-[#FEF5F1] border border-[#F4A47A] p-4 rounded-2xl flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#CA5D25" style={{ marginTop: 2, marginRight: 10 }} />
            <View className="flex-1">
              <Text className="text-xs font-bold text-[#CA5D25] uppercase tracking-wider mb-0.5">VR Microphone Note</Text>
              <Text className="text-xs font-medium text-[#CA5D25] leading-4">
                Your answers are recorded by themselves. Just allow microphone access when asked so the interviewer can hear you.
              </Text>
            </View>
          </View>
        </View>

        {/* Voice-Controlled Navigation Guidance Card */}
        <View
          className="bg-white p-6 rounded-3xl border border-[#BFD6EA] mb-5"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="mic-outline" size={22} color="#1F3A5F" />
            <Text className="text-base font-bold text-[#1F3A5F] ml-2">Voice Controls</Text>
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium mb-4">
            During the interview, use your voice to control the experience without touching the screen. You can say:
          </Text>

          <View className="gap-3">
            <View className="flex-row items-start">
              <View className="bg-[#FEF5F1] px-2.5 py-1 rounded-lg border border-[#F4A47A] mr-3 mt-0.5 min-w-[70px] items-center">
                <Text className="text-xs font-bold text-[#CA5D25]">"Next"</Text>
              </View>
              <Text className="flex-1 text-sm text-[#1F3A5F] font-medium leading-5">
                Move to the next question.
              </Text>
            </View>

            <View className="flex-row items-start">
              <View className="bg-[#FEF5F1] px-2.5 py-1 rounded-lg border border-[#F4A47A] mr-3 mt-0.5 min-w-[70px] items-center">
                <Text className="text-xs font-bold text-[#CA5D25]">"Repeat"</Text>
              </View>
              <Text className="flex-1 text-sm text-[#1F3A5F] font-medium leading-5">
                Hear the current question again.
              </Text>
            </View>

            <View className="flex-row items-start">
              <View className="bg-[#FEF5F1] px-2.5 py-1 rounded-lg border border-[#F4A47A] mr-3 mt-0.5 min-w-[70px] items-center">
                <Text className="text-xs font-bold text-[#CA5D25]">"Stop"</Text>
              </View>
              <Text className="flex-1 text-sm text-[#1F3A5F] font-medium leading-5">
                End the interview early.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="py-4">
        <PrimaryButton
          title="Enter VR Environment"
          variant="orange"
          onPress={async () => {
            try {
              const perm = await requestMicrophonePermission();
              if (perm.granted) {
                AirisOrientation.lockLandscape();
                router.push("/(student)/interview-session/immersive-active" as any);
              } else if (!perm.canAskAgain || perm.status === "blocked") {
                Alert.alert(
                  "Microphone Permission Required",
                  "AIRIS requires microphone access to detect your voice and process answers during the VR interview. Please enable Microphone in your device settings to proceed.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open Settings", onPress: () => openMicrophoneSettings() },
                  ]
                );
              } else {
                Alert.alert(
                  "Permission Denied",
                  "Microphone access is required to participate in the hands-free VR interview. Please allow microphone access to start.",
                  [{ text: "OK" }]
                );
              }
            } catch (e) {
              console.error("[ImmersiveBriefing] Error requesting microphone permission:", e);
              Alert.alert("Permission Error", "Unable to request microphone access. Please try again.");
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}
