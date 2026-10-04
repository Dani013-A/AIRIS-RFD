import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Linking } from "react-native";
import { Text } from "../../components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from "expo-audio";
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
      const status = await getRecordingPermissionsAsync();
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
      const res = await requestRecordingPermissionsAsync();
      if (res.granted) {
        setMicStatus("granted");
      } else {
        setMicStatus("denied");
        Alert.alert(
          "Microphone Permission Required",
          "This interview uses spoken answers. Enable the microphone in device settings if permission is blocked.",
          [{ text: "OK" }, { text: "Settings", onPress: () => void Linking.openSettings() }]
        );
      }
    } catch {
      setMicStatus("denied");
    }
  };

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const { hasResume, activeResume: res, activeAnalysis: anal } =
        await useResumeStore.getState().ensureResumeHydrated();
      const user = useAuthStore.getState().currentUser;

      if (!user || !hasResume || !res || !anal) {
        setError("Resume or Profile data missing. Please upload a resume and try again.");
        return;
      }

      const parsedResumeDict: Record<string, string> = {};
      if (Array.isArray(anal.parsedSections)) {
        for (const sec of anal.parsedSections) {
          parsedResumeDict[sec.name] = sec.content;
        }
      } else {
        Object.assign(parsedResumeDict, anal.parsedSections || {});
      }

      const response = await startInterviewSimulation({
        targetRole: user.targetPosition || "Unknown Role",
        program: user.degreeProgram || "Unknown Program",
        parsedResume: parsedResumeDict,
      });

      initializeSession({
        userId: user.uid,
        targetRole: user.targetPosition,
        program: user.degreeProgram,
        resumeId: user.activeResumeId || "none",
        interviewType: "one-on-one",
        firstQuestion: response.question,
        firstQuestionType: response.questionType,
        firstQuestionBenchmark: response.benchmarkAnswer,
        totalQuestions: 10,
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
        <View className="bg-white p-5 rounded-2xl border border-[#BFD6EA] mb-5 gap-4">
          {[
            ["1. Prepare", "Find a quiet place and review the interview tips."],
            ["2. Listen", "Wait for the question. Tap the speaker button to repeat it."],
            ["3. Respond", "Tap the microphone, answer naturally, then tap to stop."],
            ["4. Continue", "Review the transcript and tap Next Question when ready."],
            ["5. Stop", "Use the close button to leave the interview."],
          ].map(([title, description], index) => (
            <View key={title} className={`gap-1 ${index < 4 ? "border-b border-[#EAF2F7] pb-3" : ""}`}>
              <Text className="text-sm font-bold text-[#1F3A5F]">{title}</Text>
              <Text className="text-xs text-[#4F6B82] leading-5">{description}</Text>
            </View>
          ))}
          <Text className="text-xs text-[#4F6B82]">The controls are on-screen; voice commands are available only in immersive VR.</Text>
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
              Spoken answers require microphone permission. Enable it above or in device settings before starting.
            </Text>
          )}
        </View>
      </ScrollView>

      <View className="py-4">
        <PrimaryButton
          title="Start Simulation"
          variant="orange"
          onPress={() => router.push("/(student)/interview-session/active" as any)}
          disabled={micStatus !== "granted"}
        />
      </View>
    </SafeAreaView>
  );
}
