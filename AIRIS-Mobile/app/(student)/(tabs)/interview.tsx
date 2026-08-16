import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PrimaryButton } from "../../../src/components/ui";

export default function ExperienceSelectionScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<"one-on-one" | "panel" | "vr">("one-on-one");

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

        {/* ONE ON ONE */}
        <TouchableOpacity
          onPress={() => setSelectedType("one-on-one")}
          className={`p-5 rounded-2xl border bg-white mb-4 ${selectedType === "one-on-one" ? "border-[#F4A47A] shadow-sm" : "border-[#BFD6EA]"}`}
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: selectedType === "one-on-one" ? 0.1 : 0.05, shadowRadius: 3, elevation: 2 }}
        >
          <View className="flex-row items-center justify-between mb-3">
             <View className="flex-row items-center">
               <View className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${selectedType === "one-on-one" ? "bg-[#FEF5F1]" : "bg-[#F4F8FB]"}`}>
                 <Ionicons name="person" size={20} color={selectedType === "one-on-one" ? "#CA5D25" : "#4F6B82"} />
               </View>
               <Text className={`text-base font-extrabold ${selectedType === "one-on-one" ? "text-[#CA5D25]" : "text-[#1F3A5F]"}`}>
                 One-on-One Interview
               </Text>
             </View>
             <Ionicons name={selectedType === "one-on-one" ? "radio-button-on" : "radio-button-off"} size={24} color={selectedType === "one-on-one" ? "#CA5D25" : "#BFD6EA"} />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-13 pl-1">
            Classic format. Just you and a single interviewer focused on your resume and skills.
          </Text>
        </TouchableOpacity>

        {/* PANEL */}
        <TouchableOpacity
          disabled
          className="p-5 rounded-2xl border bg-white opacity-60 border-[#BFD6EA] mb-4"
        >
          <View className="flex-row items-center justify-between mb-3">
             <View className="flex-row items-center">
               <View className="h-10 w-10 rounded-full items-center justify-center mr-3 bg-[#F4F8FB]">
                 <Ionicons name="people" size={20} color="#4F6B82" />
               </View>
               <Text className="text-base font-extrabold text-[#1F3A5F]">
                 Panel Interview (Coming Soon)
               </Text>
             </View>
             <Ionicons name="radio-button-off" size={24} color="#BFD6EA" />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-13 pl-1">
            Dynamic format presenting to multiple evaluators sequentially.
          </Text>
        </TouchableOpacity>

        {/* VR */}
        <TouchableOpacity
          disabled
          className="p-5 rounded-2xl border bg-white opacity-60 border-[#BFD6EA] mb-8"
        >
          <View className="flex-row items-center justify-between mb-3">
             <View className="flex-row items-center">
               <View className="h-10 w-10 rounded-full items-center justify-center mr-3 bg-[#F4F8FB]">
                 <Ionicons name="headset" size={20} color="#4F6B82" />
               </View>
               <Text className="text-base font-extrabold text-[#1F3A5F]">
                 Immersive VR (Coming Soon)
               </Text>
             </View>
             <Ionicons name="radio-button-off" size={24} color="#BFD6EA" />
          </View>
          <Text className="text-sm text-[#4F6B82] leading-5 font-medium ml-13 pl-1">
            Enhanced realism in a 3D environment to practice spatial awareness.
          </Text>
        </TouchableOpacity>

        <PrimaryButton
          title="Continue Setup"
          variant="orange"
          onPress={() => {
            // Push to the new active session stack (which hides the bottom tabs)
            router.push("/(student)/interview-session/briefing" as any);
          }}
        />

      </ScrollView>
    </SafeAreaView>
  );
}
