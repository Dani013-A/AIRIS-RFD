import React, { useState, useEffect } from "react";
import { Modal, View, TouchableOpacity, Dimensions } from "react-native";
import { Text } from "./AppText";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";

const TOUR_STORAGE_KEY = "@airis_product_tour_completed_v1";

export interface ProductTourStep {
  id: string;
  title: string;
  tabName: string;
  iconName: keyof typeof Ionicons.glyphMap;
  description: string;
  badgeText: string;
}

export const TOUR_STEPS: ProductTourStep[] = [
  {
    id: "dashboard",
    title: "AIRIS Dashboard",
    tabName: "Dashboard",
    iconName: "grid-outline",
    badgeText: "Tab 1 of 5",
    description: "Your central overview of your AIRIS progress, ATS score, section breakdown, and skill gaps.",
  },
  {
    id: "resume",
    title: "Resume Analyzer",
    tabName: "Resume",
    iconName: "document-text-outline",
    badgeText: "Tab 2 of 5",
    description: "Upload and analyze your resume to identify strengths, missing sections, and improvement opportunities.",
  },
  {
    id: "interview",
    title: "Mock Interview Simulator",
    tabName: "Interview",
    iconName: "mic-outline",
    badgeText: "Tab 3 of 5",
    description: "Practice realistic, voice and text interviews tailored to your target career position.",
  },
  {
    id: "learning",
    title: "Knowledge & Learning Hub",
    tabName: "Learning",
    iconName: "book-outline",
    badgeText: "Tab 4 of 5",
    description: "Explore personalized courses, interview prep guides, and resources tailored to your profile gaps.",
  },
  {
    id: "profile",
    title: "Student Profile & Settings",
    tabName: "Profile",
    iconName: "person-outline",
    badgeText: "Tab 5 of 5",
    description: "Manage your academic information, target career position, account details, and security settings.",
  },
];

interface ProductTourOverlayProps {
  onComplete?: () => void;
}

export const ProductTourOverlay: React.FC<ProductTourOverlayProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentUser = useAuthStore((state) => state.currentUser);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const saveProductTourCompletion = useAuthStore((state) => state.saveProductTourCompletion);

  useEffect(() => {
    if (!isInitialized) return;
    checkTourStatus();
  }, [isInitialized, currentUser?.uid, currentUser?.hasCompletedProductTour]);

  const getStorageKey = () => {
    const uid = currentUser?.uid || "guest";
    return `${TOUR_STORAGE_KEY}_${uid}`;
  };

  const checkTourStatus = async () => {
    if (!currentUser) {
      setVisible(false);
      return;
    }

    // 1. Authoritative check: User-level Firestore profile state across devices
    if (currentUser.hasCompletedProductTour === true) {
      setVisible(false);
      return;
    }

    // 2. Safe local cache fallback (AsyncStorage)
    try {
      const key = getStorageKey();
      const completed = await AsyncStorage.getItem(key);
      if (completed === "true") {
        setVisible(false);
        // Sync local cache back to user profile
        saveProductTourCompletion(true);
        return;
      }
    } catch (err) {
      console.log("[PRODUCT_TOUR] Error checking tour status:", err);
    }

    // Tour not completed on any device/cache -> show tour
    setVisible(true);
  };

  const finishTour = async () => {
    try {
      const key = getStorageKey();
      await AsyncStorage.setItem(key, "true");
    } catch (err) {
      console.warn("[PRODUCT_TOUR] Error saving tour status locally:", err);
    }

    if (currentUser?.uid) {
      try {
        await saveProductTourCompletion(true);
      } catch (err) {
        console.warn("[PRODUCT_TOUR] Error saving tour status to user profile:", err);
      }
    }

    setVisible(false);
    if (onComplete) onComplete();
  };

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      finishTour();
    }
  };

  const handleSkip = () => {
    finishTour();
  };

  if (!visible) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <View className="flex-1 justify-between bg-[#1F3A5F]/80 px-5" style={{ paddingTop: Math.max(insets.top + 20, 40), paddingBottom: Math.max(insets.bottom + 20, 30) }}>
        
        {/* Top bar with step count and skip */}
        <View className="flex-row items-center justify-between">
          <View className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
            <Text className="text-xs font-bold text-white uppercase tracking-wider">{currentStep.badgeText}</Text>
          </View>
          <TouchableOpacity onPress={handleSkip} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
            <Text className="text-xs font-bold text-white">Skip Tour</Text>
          </TouchableOpacity>
        </View>

        {/* Center Tour Card */}
        <View className="bg-white rounded-3xl p-6 border border-[#BFD6EA] shadow-xl" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 }}>
          <View className="flex-row items-center gap-3 mb-4">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF5F1] border border-[#F4A47A]">
              <Ionicons name={currentStep.iconName} size={24} color="#CA5D25" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-[#CA5D25] uppercase tracking-wider">{currentStep.tabName} Feature</Text>
              <Text className="text-xl font-extrabold text-[#1F3A5F]">{currentStep.title}</Text>
            </View>
          </View>

          <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
            {currentStep.description}
          </Text>

          {/* Stepper indicators */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              {TOUR_STEPS.map((step, idx) => (
                <View
                  key={step.id}
                  className={`h-2 rounded-full ${idx === currentStepIndex ? "w-6 bg-[#CA5D25]" : "w-2 bg-[#BFD6EA]"}`}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleNext}
              className="bg-[#CA5D25] px-6 py-3 rounded-xl flex-row items-center gap-2 shadow-sm"
            >
              <Text className="text-sm font-bold text-white">
                {currentStepIndex === TOUR_STEPS.length - 1 ? "Get Started" : "Next"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacer to account for bottom navigation bar */}
        <View className="items-center">
          <Text className="text-xs font-medium text-white/80 text-center">
            Welcome to AIRIS a Career Preparation Platform
          </Text>
        </View>
      </View>
    </Modal>
  );
};
