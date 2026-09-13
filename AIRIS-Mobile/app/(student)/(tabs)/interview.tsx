import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PrimaryButton } from "../../../src/components/ui";
import { useInterviewStore } from "../../../src/store/interviewStore";

type ExperienceType = "one-on-one" | "panel" | "immersive-one-on-one" | "immersive-panel";

export default function ExperienceSelectionScreen() {
  const [selectedType, setSelectedType] = useState<ExperienceType>("one-on-one");

  const isSelected = (type: ExperienceType) => selectedType === type;

  const getCardShadow = (type: ExperienceType) => ({
    borderColor: isSelected(type) ? "#F4A47A" : "#BFD6EA",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isSelected(type) ? 0.1 : 0.05,
    shadowRadius: 3,
    elevation: 2,
  });

  const handleContinue = () => {
    if (selectedType === "one-on-one") {
      // Standard text-based interview — existing flow unchanged
      router.push("/(student)/interview-session/briefing" as any);
    } else {
      // Immersive VR flow — seed a placeholder session with the right type
      // so ImmersiveBriefingScreen knows which scene to load.
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
          className="p-5 rounded-2xl border mb-4"
          style={getCardShadow("one-on-one")}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View
                className="h-10 w-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: isSelected("one-on-one") ? "#FEF5F1" : "#F4F8FB" }}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={isSelected("one-on-one") ? "#CA5D25" : "#4F6B82"}
                />
              </View>
              <Text
                className="text-base font-extrabold"
                style={{ color: isSelected("one-on-one") ? "#CA5D25" : "#1F3A5F" }}
              >
                One-on-One Interview
              </Text>
            </View>
            <Ionicons
              name={isSelected("one-on-one") ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={isSelected("one-on-one") ? "#CA5D25" : "#BFD6EA"}
            />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-12 pl-1">
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
          className="p-5 rounded-2xl border mb-4"
          style={getCardShadow("immersive-one-on-one")}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View
                className="h-10 w-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: isSelected("immersive-one-on-one") ? "#FEF5F1" : "#F4F8FB" }}
              >
                <Ionicons
                  name="headset"
                  size={20}
                  color={isSelected("immersive-one-on-one") ? "#CA5D25" : "#4F6B82"}
                />
              </View>
              <Text
                className="text-base font-extrabold"
                style={{ color: isSelected("immersive-one-on-one") ? "#CA5D25" : "#1F3A5F" }}
              >
                Immersive One-on-One
              </Text>
            </View>
            <Ionicons
              name={isSelected("immersive-one-on-one") ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={isSelected("immersive-one-on-one") ? "#CA5D25" : "#BFD6EA"}
            />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-12 pl-1">
            Practice in a realistic 3D virtual office. Speak your answers aloud — no typing required.
          </Text>
        </TouchableOpacity>

        {/* IMMERSIVE PANEL */}
        <TouchableOpacity
          onPress={() => setSelectedType("immersive-panel")}
          className="p-5 rounded-2xl border mb-8"
          style={getCardShadow("immersive-panel")}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View
                className="h-10 w-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: isSelected("immersive-panel") ? "#FEF5F1" : "#F4F8FB" }}
              >
                <Ionicons
                  name="people"
                  size={20}
                  color={isSelected("immersive-panel") ? "#CA5D25" : "#4F6B82"}
                />
              </View>
              <Text
                className="text-base font-extrabold"
                style={{ color: isSelected("immersive-panel") ? "#CA5D25" : "#1F3A5F" }}
              >
                Immersive Panel Interview
              </Text>
            </View>
            <Ionicons
              name={isSelected("immersive-panel") ? "radio-button-on" : "radio-button-off"}
              size={24}
              color={isSelected("immersive-panel") ? "#CA5D25" : "#BFD6EA"}
            />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-12 pl-1">
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