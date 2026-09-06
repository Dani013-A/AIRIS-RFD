import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryButton } from "../../../src/components/ui";
import { useInterviewStore } from "../../../src/store/interviewStore";

type ExperienceType = "one-on-one" | "panel" | "immersive-one-on-one" | "immersive-panel";

export default function ExperienceSelectionScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ExperienceType>("one-on-one");

  const isSelected = (type: ExperienceType) => selectedType === type;

  const cardStyle = (type: ExperienceType) =>
    `p-5 rounded-2xl border bg-white mb-4 ${
      isSelected(type) ? "border-[#F4A47A] shadow-sm" : "border-[#BFD6EA]"
    }`;

  const cardShadow = (type: ExperienceType) => ({
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isSelected(type) ? 0.1 : 0.05,
    shadowRadius: 3,
    elevation: 2,
  });

  const iconBg = (type: ExperienceType) =>
    isSelected(type) ? "bg-[#FEF5F1]" : "bg-[#F4F8FB]";

  const iconColor = (type: ExperienceType) =>
    isSelected(type) ? "#CA5D25" : "#4F6B82";

  const titleColor = (type: ExperienceType) =>
    isSelected(type) ? "text-[#CA5D25]" : "text-[#1F3A5F]";

  const handleContinue = () => {
    if (selectedType === "one-on-one") {
      // Standard text-based interview — existing flow unchanged
      router.push("/(student)/interview-session/briefing" as any);
    } else {
      // Immersive VR flow — seed a placeholder session with the right type
      // so ImmersiveBriefingScreen knows which scene to load.
      // initializeSession() is called properly inside ImmersiveBriefingScreen
      // after startInterviewSimulation() returns the first question.
      useInterviewStore.setState((state) => ({
        ...state,
        status: "setup",
        session: state.session
          ? { ...state.session, interviewType: selectedType as any }
          : ({
              sessionId: "",
              userId: "",
              targetRole: "",
              program: "",
              resumeId: "",
              interviewType: selectedType as any,
              startedAt: 0,
              totalQuestions: 5,
              currentQuestion: "",
              currentQuestionType: "",
              questionsAsked: 0,
              history: [],
              evaluations: [],
            } as any),
      }));
      router.push("/(student)/interview-session/immersive-briefing" as any);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="py-6 flex-row items-center">
        <Text className="text-3xl font-extrabold text-[#1F3A5F]">Interview Prep</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        <Text className="text-sm font-bold text-[#1F3A5F] mb-4 uppercase tracking-wider">
          Experience Selection
        </Text>
        <Text className="text-sm font-medium text-[#4F6B82] mb-6 leading-5">
          Choose your interview experience to practice answering questions as if you are in a real interview.
        </Text>

        {/* ── SECTION: Standard ───────────────────────────────────────────── */}
        <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider mb-3">
          Standard Mode
        </Text>

        {/* ONE ON ONE */}
        <TouchableOpacity
          onPress={() => setSelectedType("one-on-one")}
          className={cardStyle("one-on-one")}
          style={cardShadow("one-on-one")}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${iconBg("one-on-one")}`}>
                <Ionicons name="person" size={20} color={iconColor("one-on-one")} />
              </View>
              <Text className={`text-base font-extrabold ${titleColor("one-on-one")}`}>
                One-on-One Interview
              </Text>
            </View>
            <Ionicons
              name={isSelected("one-on-one") ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={isSelected("one-on-one") ? "#CA5D25" : "#BFD6EA"}
            />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-13 pl-1">
            Classic format. Just you and a single interviewer focused on your resume and skills.
          </Text>
        </TouchableOpacity>

        {/* ── SECTION: Immersive VR ────────────────────────────────────────── */}
        <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider mb-3 mt-2">
          Immersive VR Mode
        </Text>

        {/* IMMERSIVE ONE-ON-ONE */}
        <TouchableOpacity
          onPress={() => setSelectedType("immersive-one-on-one")}
          className={cardStyle("immersive-one-on-one")}
          style={cardShadow("immersive-one-on-one")}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${iconBg("immersive-one-on-one")}`}>
                <Ionicons name="headset" size={20} color={iconColor("immersive-one-on-one")} />
              </View>
              <View>
                <Text className={`text-base font-extrabold ${titleColor("immersive-one-on-one")}`}>
                  Immersive One-on-One
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <View className="bg-[#E8F8F6] px-2 py-0.5 rounded-full border border-[#79D5C8]">
                    <Text className="text-[10px] font-bold text-[#1E5D53] uppercase tracking-wider">New</Text>
                  </View>
                </View>
              </View>
            </View>
            <Ionicons
              name={isSelected("immersive-one-on-one") ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={isSelected("immersive-one-on-one") ? "#CA5D25" : "#BFD6EA"}
            />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-13 pl-1">
            Practice in a realistic 3D virtual office. Speak your answers aloud — no typing required.
          </Text>
        </TouchableOpacity>

        {/* IMMERSIVE PANEL */}
        <TouchableOpacity
          onPress={() => setSelectedType("immersive-panel")}
          className={`${cardStyle("immersive-panel")} mb-8`}
          style={cardShadow("immersive-panel")}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${iconBg("immersive-panel")}`}>
                <Ionicons name="people" size={20} color={iconColor("immersive-panel")} />
              </View>
              <View>
                <Text className={`text-base font-extrabold ${titleColor("immersive-panel")}`}>
                  Immersive Panel Interview
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <View className="bg-[#E8F8F6] px-2 py-0.5 rounded-full border border-[#79D5C8]">
                    <Text className="text-[10px] font-bold text-[#1E5D53] uppercase tracking-wider">New</Text>
                  </View>
                </View>
              </View>
            </View>
            <Ionicons
              name={isSelected("immersive-panel") ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={isSelected("immersive-panel") ? "#CA5D25" : "#BFD6EA"}
            />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-13 pl-1">
            Face a 3-person virtual panel (Claudia, Eric, Carla) in a realistic office environment.
          </Text>
        </TouchableOpacity>

        <PrimaryButton
          title="Continue Setup"
          variant="orange"
          onPress={handleContinue}
        />

      </ScrollView>
    </SafeAreaView>
  );
}
