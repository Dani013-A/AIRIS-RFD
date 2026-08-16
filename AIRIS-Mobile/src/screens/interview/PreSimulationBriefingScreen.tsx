import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useResumeStore } from "../../store/resumeStore";
import { useInterviewStore } from "../../store/interviewStore";
import { startInterviewSimulation } from "../../services/api/interviewApi";
import { PrimaryButton } from "../../components/ui";

export default function PreSimulationBriefingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const activeResume = useResumeStore((state) => state.activeResume);
  const activeAnalysis = useResumeStore((state) => state.activeAnalysis);
  const { initializeSession, session } = useInterviewStore();

  useEffect(() => {
    startSetup();
  }, []);

  const startSetup = async () => {
    if (!currentUser || !activeResume || !activeAnalysis) {
      setError("Resume or Profile data missing. Please upload a resume and try again.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Hit the backend to generate the first question
      const response = await startInterviewSimulation({
        targetRole: currentUser.targetPosition || "Unknown Role",
        program: currentUser.degreeProgram || "Unknown Program",
        parsedResume: activeAnalysis.parsedSections || {},
      });

      // 2. Initialize the Zustand session
      initializeSession({
        userId: currentUser.uid,
        targetRole: currentUser.targetPosition,
        program: currentUser.degreeProgram,
        resumeId: currentUser.activeResumeId,
        interviewType: "one-on-one",
        firstQuestion: response.question,
        firstQuestionType: response.questionType,
        totalQuestions: 5, // We can adjust this later
      });
      
    } catch (err) {
      console.error(err);
      setError("Failed to initialize interview session. The AI provider might be down.");
    } finally {
      setLoading(false);
    }
  };

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

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F8FB] items-center justify-center px-6">
        <Ionicons name="alert-circle" size={48} color="#e53e3e" />
        <Text className="text-[#1F3A5F] font-bold text-lg mt-4 text-center">Initialization Error</Text>
        <Text className="text-[#4F6B82] text-sm text-center mt-2 font-medium mb-6">{error}</Text>
        <PrimaryButton title="Go Back" variant="outline" onPress={() => router.back()} />
        <TouchableOpacity onPress={startSetup} className="mt-4">
          <Text className="text-[#CA5D25] font-bold">Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "bottom"]}>
      <View className="py-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-6">
          <Ionicons name="arrow-back" size={24} color="#1F3A5F" />
          <Text className="text-[#1F3A5F] font-bold ml-2">Exit</Text>
        </TouchableOpacity>
        <Text className="text-sm font-bold text-[#CA5D25] uppercase tracking-wider mb-2">Pre-Simulation Briefing</Text>
        <Text className="text-3xl font-extrabold text-[#1F3A5F] leading-10">
          Get Ready.
        </Text>
      </View>

      <View className="flex-1 mt-4">
        <View className="bg-white p-6 rounded-3xl border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="bg-[#EAF2F7] px-3 py-1 rounded-full border border-[#BFD6EA]">
              <Text className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-wider">Question 1 of {session.totalQuestions}</Text>
            </View>
          </View>

          <Text className="text-xl font-extrabold text-[#1F3A5F] mb-6">
            "{session.currentQuestion}"
          </Text>

          <View className="bg-[#F1FAF8] border border-[#D7F1ED] p-4 rounded-xl flex-row items-start mt-2">
            <Ionicons name="bulb" size={20} color="#1E5D53" style={{ marginTop: 2, marginRight: 10 }} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-[#1E5D53] mb-1">Tip</Text>
              <Text className="text-sm text-[#1E5D53] font-medium leading-5">
                Take a deep breath. Use the STAR method (Situation, Task, Action, Result) if this is a behavioral question.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="pb-6">
        <PrimaryButton 
          title="Enter Simulation" 
          variant="orange" 
          icon="play"
          onPress={() => router.push("/(student)/interview-session/active" as any)} 
        />
      </View>
    </SafeAreaView>
  );
}
