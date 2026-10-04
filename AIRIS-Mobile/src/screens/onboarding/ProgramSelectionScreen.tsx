/**
 * Onboarding Page:
 * Handles the selection of the user's specific T.I.P. Manila degree program or academic strand.
 * Uses canonical T.I.P. Manila catalog only.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { BackHandler, ScrollView, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "../../components/ui/AppText";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/ui";
import { tipManilaCollegePrograms } from "../../data/tipManilaPrograms";
import { useAuthStore } from "../../store/authStore";
import { useOnboardingStore } from "../../store/onboardingStore";

export default function ProgramSelectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const saveProgramSelection = useAuthStore((state) => state.saveProgramSelection);
  const {
    college: selectedCollege,
    degreeProgram: selectedProgram,
    setDegreeProgram,
  } = useOnboardingStore();

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(student)/college-selection");
    }
  };

  React.useEffect(() => {
    const onBackPress = () => {
      handleGoBack();
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  const collegeData = tipManilaCollegePrograms.find((c) => c.name === selectedCollege);
  const programs = collegeData ? collegeData.programs : [];

  const filteredPrograms = programs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleContinue = async () => {
    if (!selectedProgram) {
      setErrorText("Please select your degree program or academic strand.");
      return;
    }

    setErrorText(null);
    setSaving(true);
    try {
      useOnboardingStore.getState().setTargetPosition("");
      await saveProgramSelection(selectedProgram);
      router.push("/(student)/position-selection");
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Failed to save program selection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between mt-4 mb-2">
        <TouchableOpacity onPress={handleGoBack} className="flex-row items-center">
          <Ionicons name="arrow-back" size={24} color="#1F3A5F" />
          <Text className="text-[#1F3A5F] font-bold ml-1 text-base">Colleges</Text>
        </TouchableOpacity>
        <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider">Step 2 of 3</Text>
      </View>

      <View className="items-center mt-2 mb-2">
        <Text className="text-center text-3xl font-extrabold text-[#1F3A5F]">
          Select Your Program
        </Text>
        <Text className="mt-2 text-center text-sm font-medium text-[#4F6B82] px-4">
          Choose your T.I.P. Manila college program or Senior High strand.
        </Text>
      </View>

      {/* Search Input block */}
      {programs.length > 0 && (
        <View className="mt-4 mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <Ionicons name="search-outline" size={20} color="#8B95A5" />
          <TextInput
            className="ml-3 flex-1 h-full text-base text-[#1F3A5F]"
            style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
            placeholder="Search program or course..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} className="p-2 -mr-2">
              <Ionicons name="close-circle" size={20} color="#8B95A5" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <ScrollView
        className="mt-2 flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 36) }}
      >
        <View className="gap-3">
          {filteredPrograms.map((program) => {
            const isSelected = selectedProgram === program.name;
            return (
              <TouchableOpacity
                key={program.name}
                activeOpacity={0.85}
                onPress={() => {
                  if (!saving) {
                    setDegreeProgram(program.name);
                  }
                }}
                disabled={saving}
                className={`w-full min-h-[76px] flex-row items-center rounded-2xl px-5 py-4 border ${
                  isSelected ? "bg-[#FEF5F1] border-[#F4A47A]" : "bg-white border-[#BFD6EA]"
                } ${saving ? "opacity-60" : ""}`}
                style={isSelected ? {} : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
              >
                <View className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${isSelected ? 'bg-white' : 'bg-[#EAF2F7]'}`}>
                  <Ionicons name="school-outline" size={20} color={isSelected ? "#CA5D25" : "#1F3A5F"} />
                </View>
                <Text className={`flex-1 text-sm font-bold leading-5 ${isSelected ? 'text-[#CA5D25]' : 'text-[#1F3A5F]'}`}>
                  {program.name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={24} color="#F4A47A" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action button in scroll flow */}
        <View className="mt-8">
          {errorText ? (
            <Text className="text-center text-sm font-bold text-[#CA5D25] mb-3">{errorText}</Text>
          ) : null}
          <PrimaryButton
            title="Continue"
            variant="orange"
            onPress={handleContinue}
            loading={saving}
            disabled={saving || !selectedProgram}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
