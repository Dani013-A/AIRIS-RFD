import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";
import { startInterviewSimulation } from "../../services/api/interviewApi";
import { PrimaryButton } from "../../components/ui";
import { normalizeApiError } from "../../utils/errorMapper";

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
  const { initializeSession, session } = useInterviewStore();

  useEffect(() => {
    // Kick off session initialisation as soon as the screen mounts
    startSetup();
  }, []);

  const startSetup = async () => {
    if (!currentUser || !activeResume || !activeAnalysis) {
      setError("Resume or profile data is missing. Please upload a resume and try again.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Build the same parsedResume dict that ActiveSimulationScreen builds
      const parsedResumeDict: Record<string, string> = {};
      if (Array.isArray(activeAnalysis.parsedSections)) {
        for (const sec of activeAnalysis.parsedSections) {
          parsedResumeDict[sec.name] = sec.content;
        }
      } else {
        Object.assign(parsedResumeDict, activeAnalysis.parsedSections || {});
      }

      // Detect the interview type stored by ExperienceSelectionScreen
      // so we can pass it to initializeSession
      const pendingType = useInterviewStore.getState().session?.interviewType;
      const interviewType: "one-on-one" | "panel" =
        pendingType === "immersive-panel" ? "panel" : "one-on-one";

      // ── Daniel's existing API call (unchanged) ───────────────────────────────
      const response = await startInterviewSimulation({
        targetRole: currentUser.targetPosition || "Unknown Role",
        program: currentUser.degreeProgram || "Unknown Program",
        parsedResume: parsedResumeDict,
      });

      // Seed Zustand store — same initializeSession() the Standard flow uses
      initializeSession({
        userId: currentUser.uid,
        targetRole: currentUser.targetPosition,
        program: currentUser.degreeProgram,
        resumeId: currentUser.activeResumeId || "none",
        interviewType,
        firstQuestion: response.question,
        firstQuestionType: response.questionType,
        firstQuestionBenchmark: response.benchmarkAnswer,
        totalQuestions: 5,
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
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
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
            You will be placed inside a virtual office environment. The AI interviewer(s) will speak their questions aloud and your voice will be recorded automatically after each question. There is no need to tap any button — the simulation runs hands-free.
          </Text>

          <View className="gap-2.5 mb-4">
            {[
              "Find a quiet location before starting",
              "Speak clearly and at a natural pace",
              "The microphone is handled by the VR environment — no extra setup needed",
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
                Audio recording and transcription are handled entirely inside the VR environment. You do not need to grant microphone permissions to the app — the VR scene will request them directly on Android.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="py-4">
        <PrimaryButton
          title="Enter VR Environment"
          variant="orange"
          onPress={() => router.push("/(student)/interview-session/immersive-active" as any)}
        />
      </View>
    </SafeAreaView>
  );
}
