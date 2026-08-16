import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InterviewPlaceholderScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between py-4">
        <View>
          <Text className="text-sm font-bold text-[#4F6B82] uppercase tracking-wider">Simulation Hub</Text>
          <Text className="text-2xl font-extrabold text-[#1F3A5F]">Interview Practice</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 100 }}
      >
        <View className="rounded-3xl bg-white p-8 border border-[#BFD6EA] items-center" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <View className="h-24 w-24 items-center justify-center rounded-full bg-[#FEF5F1] mb-6 border-4 border-white shadow-sm">
            <Ionicons name="mic" size={48} color="#F4A47A" />
          </View>

          <Text className="text-2xl font-extrabold text-center text-[#1F3A5F]">
            Coming Soon
          </Text>
          <Text className="mt-4 text-sm font-medium leading-6 text-center text-[#4F6B82] px-2">
            Practice mock interviews inside a realistic virtual office simulator and get instant AI metrics feedback on your performance.
          </Text>
          
          <View className="mt-8 bg-[#EAF2F7] px-4 py-2 rounded-full border border-[#BFD6EA]">
             <Text className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wider">In Development</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
