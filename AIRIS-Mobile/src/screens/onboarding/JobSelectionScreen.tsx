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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/ui";
import { tipManilaPrograms } from "../../data/tipManilaPrograms";
import { validateCareerRole } from "../../services/ai/careerValidator";
import { useAuthStore } from "../../store/authStore";
import { useOnboardingStore } from "../../store/onboardingStore";
import { fuzzyMatchRole } from "../../utils/fuzzyMatcher";
import { evaluateCareerTargetCompatibility, CareerCompatibilityResult } from "../../services/ai/careerCompatibilityGuardrail";
import { CareerCompatibilityModal } from "../../components/ui/CareerCompatibilityModal";

const BACKEND_ENDPOINT = `${process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000')}/normalize`;

export default function JobSelectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");

  const [compatibilityResult, setCompatibilityResult] = useState<CareerCompatibilityResult | null>(null);
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false);

  const { college, degreeProgram, targetPosition, setTargetPosition } = useOnboardingStore();
  const completeInitialSetup = useAuthStore((state) => state.completeInitialSetup);
  const loading = useAuthStore((state) => state.loading);

  React.useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  // Robust program lookup across entire canonical catalog regardless of college string formatting
  const programData = React.useMemo(() => {
    const cleanProg = (degreeProgram || "").toLowerCase().trim();
    if (!cleanProg) return null;
    return tipManilaPrograms
      .flatMap((c) => c.programs)
      .find((p) => p.name.toLowerCase().trim() === cleanProg || p.name.toLowerCase().includes(cleanProg) || cleanProg.includes(p.name.toLowerCase()));
  }, [degreeProgram]);

  const defaultSuggestions = React.useMemo(() => {
    return programData?.suggestedPositions ?? tipManilaPrograms.flatMap((c) => c.programs.flatMap((p) => p.suggestedPositions)).slice(0, 12);
  }, [programData]);

  // Instant multi-level search filtering across program suggestions + all catalog roles
  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return defaultSuggestions;
    }

    const allCanonicalRoles = Array.from(
      new Set(tipManilaPrograms.flatMap((c) => c.programs.flatMap((p) => p.suggestedPositions)))
    );

    // 1. First priority: program-specific suggestions matching query
    const programMatches = (programData?.suggestedPositions || []).filter((job) =>
      job.toLowerCase().includes(query)
    );

    // 2. Second priority: all catalog roles matching query
    const allMatches = allCanonicalRoles.filter((job) => {
      const jobLower = job.toLowerCase();
      if (jobLower.includes(query)) return true;
      const tokens = query.split(/\s+/).filter(Boolean);
      return tokens.length > 1 && tokens.every((t) => jobLower.includes(t));
    });

    return Array.from(new Set([...programMatches, ...allMatches]));
  }, [search, defaultSuggestions, programData]);

  const isCustomQueryNew = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return false;
    return !filtered.some((pos) => pos.toLowerCase() === query);
  }, [search, filtered]);

  const handleValidateCustomRole = async () => {
    const queryRole = search.trim();
    if (!queryRole) return;

    setIsValidating(true);
    setValidationError("");

    let normalizedResult: any = null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "job", input: queryRole }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        normalizedResult = await response.json();
      }
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn("Backend normalization offline or timed out, falling back to local:", e);
    }

    try {
      if (normalizedResult && normalizedResult.normalizedValue) {
        const resolvedValue = normalizedResult.normalizedValue;
        setTargetPosition(resolvedValue);
        setSearch("");
        setValidationError("");
        if (resolvedValue.toLowerCase() !== queryRole.toLowerCase()) {
          Alert.alert(
            "Role Standardized",
            `Mapped "${queryRole}" to industry title: "${resolvedValue}"`
          );
        }
        return;
      }

      const fuzzyMatched = fuzzyMatchRole(queryRole);
      const roleToValidate = fuzzyMatched || queryRole;

      const validationResult = await validateCareerRole(roleToValidate, degreeProgram || "");
      if (validationResult.isValid) {
        setTargetPosition(roleToValidate);
        setSearch("");
        setValidationError("");
        if (fuzzyMatched && fuzzyMatched.toLowerCase() !== queryRole.toLowerCase()) {
          Alert.alert(
            "Role Resolved",
            `Mapped "${queryRole}" to standard title "${fuzzyMatched}".`
          );
        }
      } else {
        setValidationError(validationResult.reason || "Invalid career role.");
      }
    } catch {
      setValidationError("Failed to validate custom role. Please select from suggested list.");
    } finally {
      setIsValidating(false);
    }
  };

  async function executeCompleteSetup() {
    setShowCompatibilityModal(false);
    setCompatibilityResult(null);
    await completeInitialSetup(college, degreeProgram, targetPosition);
    router.replace("/(student)/onboarding");
  }

  async function handleContinue() {
    if (!targetPosition) {
      Alert.alert("Selection Required", "Please select a target position to continue.");
      return;
    }

    const valResult = await validateCareerRole(targetPosition, degreeProgram || "");
    if (!valResult.isValid) {
      Alert.alert("Target Position Invalid", valResult.reason || "Please select a valid professional role.");
      return;
    }

    const compResult = evaluateCareerTargetCompatibility(degreeProgram || "", targetPosition);

    if (compResult.classification === "DISTANT") {
      setCompatibilityResult(compResult);
      setShowCompatibilityModal(true);
      return;
    }

    if (compResult.classification === "PIVOT") {
      Alert.alert(
        "Career Transition Notice",
        compResult.reason,
        [
          { text: "Select Different Target", style: "cancel" },
          { text: "Continue Transition", onPress: () => executeCompleteSetup() }
        ]
      );
      return;
    }

    await executeCompleteSetup();
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB] px-6" edges={["top", "left", "right"]}>
      <View className="items-center mb-6 mt-6">
        <Text className="text-center text-3xl font-extrabold text-[#1F3A5F]">
          Target Position
        </Text>
        <Text className="mt-2 text-center text-sm font-medium text-[#4F6B82] px-4">
          Select or search the specific career track you wish to prepare for.
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
          onChangeText={(txt) => {
            setSearch(txt);
            if (validationError) setValidationError("");
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => { setSearch(""); setValidationError(""); }} className="p-2 -mr-2">
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
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 36) }}
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
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#CA5D25" />
                  <Text className="text-sm font-bold text-[#CA5D25]">Standardizing custom role...</Text>
                </View>
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
            {search.trim() ? "Search Results" : `Suggested Roles for ${degreeProgram || "Your Program"}`}
          </Text>
        )}

        {filtered.length === 0 && !isCustomQueryNew && (
          <View className="py-8 items-center justify-center">
            <Ionicons name="search-outline" size={36} color="#94A3B8" />
            <Text className="mt-2 text-sm font-semibold text-[#64748B]">No matching standard roles found</Text>
            <Text className="text-xs text-[#94A3B8] text-center mt-1 px-6">
              Try searching with different keywords or type a custom role title above.
            </Text>
          </View>
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
                <View className={`mr-4 h-12 w-12 items-center justify-center rounded-full ${selected ? "bg-white" : "bg-[#EAF2F7]"}`}>
                  <Ionicons name="briefcase-outline" size={18} color={selected ? "#CA5D25" : "#1F3A5F"} />
                </View>
                <Text className={`text-sm font-bold flex-1 ${selected ? "text-[#CA5D25]" : "text-[#1F3A5F]"}`}>{position}</Text>
                {selected && <Ionicons name="checkmark-circle" size={22} color="#F4A47A" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action button in scroll flow */}
        <View className="mt-8">
          <PrimaryButton
            title="Continue"
            variant="orange"
            onPress={handleContinue}
            loading={loading}
            disabled={!targetPosition || loading}
          />
        </View>
      </ScrollView>

      <CareerCompatibilityModal
        visible={showCompatibilityModal}
        compatibilityResult={compatibilityResult}
        onCancel={() => {
          setShowCompatibilityModal(false);
          setCompatibilityResult(null);
        }}
        onConfirm={executeCompleteSetup}
        isProcessing={loading}
      />
    </SafeAreaView>
  );
}
