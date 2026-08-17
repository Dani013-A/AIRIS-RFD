/**
 * Onboarding Page:
 * Handles the selection or input of the user's target career position.
 * Integrates professional validation and backend normalization.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/ui";
import { tipManilaPrograms } from "../../data/tipManilaPrograms";
import { validateCareerRole } from "../../services/ai/careerValidator";
import { useAuthStore } from "../../store/authStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import { fuzzyMatchRole } from "../../utils/fuzzyMatcher";

const BACKEND_ENDPOINT = `${process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000')}/normalize`;

export default function JobSelectionScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");

  const { college, degreeProgram, targetPosition, setTargetPosition } = useOnboardingStore();
  const completeInitialSetup = useAuthStore((state) => state.completeInitialSetup);
  const loading = useAuthStore((state) => state.loading);

  React.useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  const collegeData = tipManilaPrograms.find((c) => c.name === college);
  const programData = collegeData?.programs.find((p) => p.name === degreeProgram);
  const suggestions = programData?.suggestedPositions ?? [];

  const filtered = suggestions.filter((job) => job.toLowerCase().includes(search.toLowerCase()));

  const isCustomQueryNew =
    search.trim() !== "" &&
    !suggestions.some((pos) => pos.toLowerCase() === search.trim().toLowerCase());

  const handleValidateCustomRole = async () => {
    const queryRole = search.trim();
    if (!queryRole) return;

    setIsValidating(true);
    setValidationError("");

    // Step 1: Attempt AI-powered normalization on the backend
    let normalizedResult = null;
    try {
      const response = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "job",
          input: queryRole,
        }),
      });

      if (response.ok) {
        normalizedResult = await response.json();
      }
    } catch (e) {
      console.warn("Backend normalization failed, falling back to local:", e);
    }

    // Step 2: Handle normalization output and fallback
    if (normalizedResult && normalizedResult.normalizedValue) {
      const resolvedValue = normalizedResult.normalizedValue;
      setTargetPosition(resolvedValue);
      setSearch("");
      setValidationError("");
      
      if (resolvedValue.toLowerCase() !== queryRole.toLowerCase()) {
        Alert.alert(
          "Role Normalized",
          `We standardized your input "${queryRole}" to the industry-canonical title: "${resolvedValue}"`
        );
      }
      setIsValidating(false);
      return;
    }

    // Step 3: Local structural suffix validation if backend is offline or returned custom fallback
    try {
      const fuzzyMatched = fuzzyMatchRole(queryRole);
      const roleToValidate = fuzzyMatched || queryRole;

      const result = await validateCareerRole(roleToValidate, degreeProgram);
      if (result.isValid) {
        setTargetPosition(roleToValidate);
        setSearch("");
        setValidationError("");
        if (fuzzyMatched && fuzzyMatched.toLowerCase() !== queryRole.toLowerCase()) {
          Alert.alert(
            "Role Resolved",
            `We mapped "${queryRole}" to standard title "${fuzzyMatched}".`
          );
        }
      } else {
        setValidationError(result.reason || "Invalid career role.");
      }
    } catch {
      setValidationError("Failed to execute validation. Please try again.");
    } finally {
      setIsValidating(false);
    }
  };

  async function handleContinue() {
    if (!targetPosition) {
      Alert.alert("Selection Required", "Please select a target position to continue.");
      return;
    }
    await completeInitialSetup(college, degreeProgram, targetPosition);
    router.replace("/(student)/onboarding");
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="items-center mb-6 mt-6">
        <Text className="text-center text-3xl font-extrabold text-[#1F3A5F]">
          Target Position
        </Text>
        <Text className="mt-2 text-center text-sm font-medium text-[#4F6B82] px-4">
          Select or enter the specific career track you wish to prepare for.
        </Text>
      </View>

      {/* Search Input bar */}
      <View className="mb-4 flex-row items-center rounded-xl bg-white px-4 h-14 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
        <Ionicons name="search-outline" size={20} color="#8B95A5" />
        <TextInput
          className="ml-3 flex-1 text-base text-[#1F3A5F]"
          placeholder="Search target position..."
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

      {/* Selected position status */}
      {targetPosition ? (
        <View className="mb-4 flex-row items-center justify-between rounded-xl bg-[#FEF5F1] px-5 py-4 border border-[#FDEEE6]">
          <Text className="text-sm font-bold text-[#1F3A5F] flex-1">
            Targeting: <Text className="text-[#CA5D25]">{targetPosition}</Text>
          </Text>
          <TouchableOpacity onPress={() => setTargetPosition("")} className="p-1 -mr-1">
            <Ionicons name="close" size={20} color="#CA5D25" />
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
      >
        {isCustomQueryNew && (
          <View className="mb-4">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleValidateCustomRole}
              disabled={isValidating}
              className="w-full rounded-2xl py-4 px-5 items-center justify-center border border-dashed border-[#F4A47A] bg-[#FEF5F1]"
            >
              {isValidating ? (
                <ActivityIndicator color="#F4A47A" />
              ) : (
                <Text className="text-sm font-bold text-[#CA5D25] text-center">
                  Select Custom Role: "{search.trim()}"
                </Text>
              )}
            </TouchableOpacity>
            {validationError ? (
              <Text className="mt-2 text-xs font-semibold text-[#CA5D25] text-center px-4">
                {validationError}
              </Text>
            ) : null}
          </View>
        )}

        {filtered.length > 0 && (
          <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-[#4F6B82]">
            Suggested Roles
          </Text>
        )}

        <View className="gap-3">
          {filtered.map((position) => {
            const selected = targetPosition === position;
            return (
              <TouchableOpacity
                key={position}
                activeOpacity={0.85}
                onPress={() => setTargetPosition(position)}
                className={`w-full min-h-[64px] flex-row items-center rounded-2xl px-5 py-3 border ${
                  selected ? "bg-[#FEF5F1] border-[#F4A47A]" : "bg-white border-[#BFD6EA]"
                }`}
                style={selected ? {} : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
              >
                <View className={`mr-4 h-10 w-10 items-center justify-center rounded-full ${selected ? "bg-white" : "bg-[#EAF2F7]"}`}>
                  <Ionicons name="briefcase-outline" size={18} color={selected ? "#CA5D25" : "#1F3A5F"} />
                </View>
                <Text className={`text-sm font-bold flex-1 ${selected ? "text-[#CA5D25]" : "text-[#1F3A5F]"}`}>{position}</Text>
                {selected && <Ionicons name="checkmark-circle" size={22} color="#F4A47A" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Action button */}
      <View className="absolute bottom-6 left-6 right-6">
        <PrimaryButton
          title="Continue"
          variant="orange"
          onPress={handleContinue}
          loading={loading}
          disabled={!targetPosition || loading}
        />
      </View>
    </SafeAreaView>
  );
}
