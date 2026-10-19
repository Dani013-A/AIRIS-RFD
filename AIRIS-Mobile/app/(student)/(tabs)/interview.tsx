import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "../../../src/components/ui/AppText";
import { InterviewOptionCard, PrimaryButton } from "../../../src/components/ui";
import { useInterviewStore } from "../../../src/store/interviewStore";

type ExperienceType = "one-on-one" | "immersive-one-on-one" | "immersive-panel";

const OPTIONS: Array<{
  type: ExperienceType;
  title: string;
  description: string;
  icon: "person" | "headset" | "people";
  badge?: string;
}> = [
  {
    type: "one-on-one",
    title: "One-on-One Interview",
    description: "You and one interviewer. Answer typed or spoken questions about your resume and skills.",
    icon: "person",
  },
  {
    type: "immersive-one-on-one",
    title: "Immersive One-on-One",
    description: "Practice inside a realistic 3D office. Speak your answers out loud, hands-free.",
    icon: "headset",
    badge: "3D Experience",
  },
  {
    type: "immersive-panel",
    title: "Immersive Panel Interview",
    description: "Answer a 3-person virtual panel in a realistic office. Good practice for panel interviews.",
    icon: "people",
    badge: "3D Panel",
  },
];

export default function ExperienceSelectionScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ExperienceType>("one-on-one");

  const handleContinue = () => {
    useInterviewStore.getState().resetSessionForNewInterview(selectedType);
    if (selectedType === "one-on-one") {
      router.push("/(student)/interview-session/briefing" as any);
    } else {
      router.push("/(student)/interview-session/immersive-briefing" as any);
    }
  };

  const standard = OPTIONS.filter((o) => o.type === "one-on-one");
  const immersive = OPTIONS.filter((o) => o.type !== "one-on-one");

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="py-6">
        <Text className="text-3xl font-extrabold text-[#1F3A5F]">Interview Prep</Text>
        <Text className="text-sm font-medium text-[#4F6B82] mt-1 leading-5">
          Pick how you want to practice. You can try another style anytime.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider mb-3">
          Standard Mode
        </Text>
        {standard.map((option) => (
          <InterviewOptionCard
            key={option.type}
            option={option}
            selected={selectedType === option.type}
            onSelect={() => setSelectedType(option.type)}
          />
        ))}

        <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider mb-3 mt-4">
          Immersive VR Mode
        </Text>
        {immersive.map((option) => (
          <InterviewOptionCard
            key={option.type}
            option={option}
            selected={selectedType === option.type}
            onSelect={() => setSelectedType(option.type)}
          />
        ))}

        <View className="mt-4">
          <PrimaryButton
            title="Continue Setup"
            variant="orange"
            onPress={handleContinue}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
