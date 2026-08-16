/**
 * Onboarding Page:
 * Handles the selection of the user's TIP College or Senior High School department.
 * Supports custom inputs if not listed.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, BackHandler, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/ui";
import { tipManilaPrograms } from "../../data/tipManilaPrograms";
import { useAuthStore } from "../../store/authStore";
import { useOnboardingStore } from "../../store/onboardingStore";

export default function CollegeSelectionScreen() {
  const router = useRouter();
  const saveCollegeSelection = useAuthStore((state) => state.saveCollegeSelection);
  const { college: selectedCollege, setCollege } = useOnboardingStore();

  const [search, setSearch] = useState("");
  const [customCollege, setCustomCollege] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  React.useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  const handleContinue = async () => {
    const finalCollege = isCustomMode ? customCollege.trim() : selectedCollege;
    if (!finalCollege) {
      setErrorText("Please select or enter a college name.");
      return;
    }
    
    setErrorText(null);
    setSaving(true);
    try {
      await saveCollegeSelection(finalCollege);
      if (isCustomMode) {
        setCollege(finalCollege);
      }
      router.push("/(student)/program-selection");
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Failed to save college selection.");
    } finally {
      setSaving(false);
    }
  };

  const filteredColleges = tipManilaPrograms.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="items-center mt-6 mb-2">
        <Text className="text-center text-3xl font-extrabold text-[#1F3A5F]">
          Select Your College
        </Text>
        <Text className="mt-2 text-center text-sm font-medium text-[#4F6B82] px-4">
          Choose your TIP college/strand or enter a custom one.
        </Text>
      </View>

      {/* Search Input block */}
      {!isCustomMode && (
        <View className="mt-4 mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <Ionicons name="search-outline" size={20} color="#8B95A5" />
          <TextInput
            className="ml-3 flex-1 text-base text-[#1F3A5F]"
            placeholder="Search college or strand..."
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
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <View className="gap-3">
          {isCustomMode ? (
            <View className="bg-white rounded-2xl p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
              <Text className="text-sm font-bold text-[#1F3A5F] mb-3">Enter Custom School/College Name:</Text>
              <TextInput
                className="w-full bg-[#F4F8FB] rounded-xl px-4 h-14 text-base text-[#1F3A5F] border border-[#BFD6EA]"
                placeholder="e.g. College of Arts & Sciences"
                placeholderTextColor="#94A3B8"
                value={customCollege}
                onChangeText={setCustomCollege}
              />
              <TouchableOpacity
                onPress={() => {
                  setIsCustomMode(false);
                  setCustomCollege("");
                }}
                className="flex-row items-center justify-end mt-4"
              >
                <Text className="text-sm font-bold text-[#CA5D25]">Cancel Custom Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {filteredColleges.map((college) => {
                const isSelected = selectedCollege === college.name;
                return (
                  <TouchableOpacity
                    key={college.name}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!saving) {
                        setCollege(college.name);
                      }
                    }}
                    disabled={saving}
                    className={`w-full min-h-[76px] flex-row items-center rounded-2xl px-5 py-4 border ${
                      isSelected ? "bg-[#FEF5F1] border-[#F4A47A]" : "bg-white border-[#BFD6EA]"
                    } ${saving ? "opacity-60" : ""}`}
                    style={isSelected ? {} : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                  >
                    <View className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${isSelected ? 'bg-white' : 'bg-[#EAF2F7]'}`}>
                      <Ionicons name="business-outline" size={20} color={isSelected ? "#CA5D25" : "#1F3A5F"} />
                    </View>
                    <Text className={`flex-1 text-sm font-bold leading-5 ${isSelected ? 'text-[#CA5D25]' : 'text-[#1F3A5F]'}`}>
                      {college.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#F4A47A" />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setIsCustomMode(true);
                  setCollege("");
                }}
                className="w-full min-h-[76px] flex-row items-center rounded-2xl px-5 py-4 border border-dashed border-[#BFD6EA] bg-transparent mt-2"
              >
                <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-white">
                  <Ionicons name="add" size={20} color="#4F6B82" />
                </View>
                <Text className="flex-1 text-sm font-bold text-[#4F6B82]">
                  Other / School Not Listed
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Action button */}
      <View className="absolute bottom-6 left-6 right-6">
        {errorText ? (
          <Text className="text-center text-sm font-bold text-[#CA5D25] mb-3">{errorText}</Text>
        ) : null}
        <PrimaryButton
          title="Continue"
          variant="orange"
          onPress={handleContinue}
          loading={saving}
          disabled={saving || (!isCustomMode && !selectedCollege) || (isCustomMode && !customCollege.trim())}
        />
      </View>
    </SafeAreaView>
  );
}
