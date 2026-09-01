import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";
import { startInterviewSimulation } from "../../services/api/interviewApi";
import { PrimaryButton } from "../../components/ui";
import { normalizeApiError } from "../../utils/errorMapper";

export default function PreSimulationBriefingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micStatus, setMicStatus] = useState<"granted" | "denied" | "undetermined">("undetermined");

  const currentUser = useAuthStore((state) => state.currentUser);
  const activeResume = useResumeStore((state) => state.activeResume);
  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);
  const { initializeSession, session } = useInterviewStore();

  useEffect(() => {
    startSetup();
    checkMicPermissions();
  }, []);

  const checkMicPermissions = async () => {
    try {
      const status = await Audio.getPermissionsAsync();
      if (status.granted) {
        setMicStatus("granted");
      } else {
        setMicStatus("denied");
      }
    } catch {
      setMicStatus("denied");
    }
  };

  const requestMicPermissions = async () => {
    try {
      const res = await Audio.requestPermissionsAsync();
      if (res.granted) {
        setMicStatus("granted");
      } else {
        setMicStatus("denied");
        Alert.alert(
          "Microphone Permission Required",
          "Voice dictation requires microphone permission. You can enable it in your device settings or proceed with typed responses."
        );
      }
    } catch {
      setMicStatus("denied");
    }
  };

  const startSetup = async () => {
    if (!currentUser || !activeResume || !activeAnalysis) {
      setError("Resume or Profile data missing. Please upload a resume and try again.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const parsedResumeDict: Record<string, string> = {};
      if (Array.isArray(activeAnalysis.parsedSections)) {
        for (const sec of activeAnalysis.parsedSections) {
          parsedResumeDict[sec.name] = sec.content;
        }
      } else {
        Object.assign(parsedResumeDict, activeAnalysis.parsedSections || {});
      }

      const response = await startInterviewSimulation({
        targetRole: currentUser.targetPosition || "Unknown Role",
        program: currentUser.degreeProgram || "Unknown Program",
        parsedResume: parsedResumeDict,
      });

      initializeSession({
        userId: currentUser.uid,
        targetRole: currentUser.targetPosition,
        program: currentUser.degreeProgram,
        resumeId: currentUser.activeResumeId || "none",
        interviewType: "one-on-one",
        firstQuestion: response.question,
        firstQuestionType: response.questionType,
        firstQuestionBenchmark: response.benchmarkAnswer,
        totalQuestions: 5,
      });
    } catch (err) {
      console.error(err);
      const normalized = normalizeApiError(err, "Failed to initialize interview session. Please try again.");
      setError(normalized.userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] items-center justify-center px-6">
        <Ionicons name="alert-circle" size={48} color="#e53e3e" />
        <Text className="text-[#1F3A5F] font-bold text-lg mt-4 text-center">Initialization Error</Text>
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

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "bottom"]}>
      <View className="py-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
          <Ionicons name="arrow-back" size={24} color="#1F3A5F" />
          <Text className="text-[#1F3A5F] font-bold ml-2">Exit</Text>
        </TouchableOpacity>
        <Text className="text-xs font-bold text-[#CA5D25] uppercase tracking-wider mb-1">Pre-Simulation Briefing</Text>
        <Text className="text-3xl font-extrabold text-[#1F3A5F]">
          Before You Start
        </Text>
      </View>

      <ScrollView className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
        {/* Environment Readiness Card */}
        <View className="bg-white p-6 rounded-3xl border border-[#BFD6EA] mb-5" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <View className="flex-row items-center mb-3">
            <Ionicons name="volume-medium-outline" size={22} color="#1F3A5F" />
            <Text className="text-base font-bold text-[#1F3A5F] ml-2">Quiet Environment Guidance</Text>
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium mb-4">
            Please make sure you are in a quiet environment before beginning your interview. AIRIS evaluates your spoken responses, including speech clarity, filler words, and speaking pauses. Background conversations, music, TV/audio, traffic, or other significant noise may interfere with speech recognition and may affect the accuracy of your interview evaluation.
          </Text>

          <View className="gap-2.5 mb-4">
            {[
              "Find a quiet location",
              "Use headphones or a headset microphone if available",
              "Keep your microphone unobstructed",
              "Speak clearly and at a natural pace",
              "Avoid background conversations and media",
              "Remain in the interview environment until the simulation ends"
            ].map((tip, idx) => (
              <View key={idx} className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={18} color="#79D5C8" style={{ marginTop: 2, marginRight: 8 }} />
                <Text className="flex-1 text-sm font-medium text-[#1F3A5F] leading-5">{tip}</Text>
              </View>
            ))}
          </View>

          <View className="bg-[#FEF5F1] border border-[#F4A47A] p-4 rounded-2xl flex-row items-start">
            <Ionicons name="heart-outline" size={20} color="#CA5D25" style={{ marginTop: 2, marginRight: 10 }} />
            <View className="flex-1">
              <Text className="text-xs font-bold text-[#CA5D25] uppercase tracking-wider mb-0.5">Reassuring Note</Text>
              <Text className="text-xs font-medium text-[#CA5D25] leading-4">
                Your responses are evaluated based on your interview session. Do not worry about being perfect. Answer naturally and honestly.
              </Text>
            </View>
          </View>
        </View>

        {/* Microphone Readiness Card */}
        <View className="bg-white p-5 rounded-3xl border border-[#BFD6EA] mb-6" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name={micStatus === "granted" ? "mic-outline" : "mic-off-outline"}
                size={22}
                color={micStatus === "granted" ? "#1E5D53" : "#CA5D25"}
              />
              <Text className="text-sm font-bold text-[#1F3A5F] ml-2">
                Microphone Status: {micStatus === "granted" ? "Ready" : "Permission Needed"}
              </Text>
            </View>
            {micStatus !== "granted" && (
              <TouchableOpacity onPress={requestMicPermissions} className="bg-[#FEF5F1] px-3 py-1.5 rounded-full border border-[#F4A47A]">
                <Text className="text-xs font-bold text-[#CA5D25]">Enable Mic</Text>
              </TouchableOpacity>
            )}
          </View>
          {micStatus !== "granted" && (
            <Text className="text-xs text-[#4F6B82] font-medium mt-2 leading-4">
              Voice dictation requires microphone permission. If denied, typed responses remain fully supported for standard interview mode.
            </Text>
          )}
        </View>
      </ScrollView>

      <View className="py-4">
        <PrimaryButton
          title="Start Simulation"
          variant="orange"
          onPress={() => router.push("/(student)/interview-session/active" as any)}
        />
      </View>
    </SafeAreaView>
  );
}

