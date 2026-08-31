import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, BackHandler, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const authLoading = useAuthStore((state) => state.loading);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  React.useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => subscription.remove();
  }, []);

  const handleContinue = async () => {
    if (!agreeTerms || !agreePrivacy) {
      Alert.alert("Consent Required", "Please check and agree to both the Terms of Service and Privacy Policy to proceed.");
      return;
    }

    try {
      await completeOnboarding(agreeTerms, agreePrivacy, "1.0.0", "1.0.0");
      router.replace("/(student)/(tabs)/dashboard" as any);
    } catch (err) {
      Alert.alert(
        "Onboarding Error",
        err instanceof Error ? err.message : "Failed to complete onboarding. Please try again."
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB]" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 36) }}
      >
        <View className="items-center px-6 pt-10 pb-8 bg-[#CFE0EC] rounded-b-[40px] border-b border-[#BFD6EA] mb-6">
          <Image
            source={require("../../../assets/images/airis-logo-new.png")}
            className="mb-4 h-24 w-24 rounded-3xl"
            resizeMode="contain"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
          />

          <Text className="text-3xl font-extrabold tracking-tight text-[#1F3A5F] mb-1">AIRIS</Text>
          <Text className="text-center text-sm font-bold text-[#CA5D25] uppercase tracking-widest mb-4">
            Welcome, {currentUser?.fullName || "Student"}
          </Text>

          <Text className="text-center text-sm font-medium text-[#4F6B82] leading-6 px-4">
            Here's how AIRIS helps you prepare for employment and stand out to recruiters.
          </Text>
        </View>

        <View className="px-6 gap-4">
          <View className="rounded-2xl bg-white p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <View className="flex-row items-center mb-3">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                <Ionicons name="document-text" size={20} color="#1F3A5F" />
              </View>
              <Text className="text-base font-bold text-[#1F3A5F]">Resume Analysis</Text>
            </View>
            <Text className="text-sm font-medium text-[#4F6B82] leading-5 ml-13">
              Get instant, evidence-based feedback on your resume structure and missing skills.
            </Text>
          </View>

          <View className="rounded-2xl bg-white p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <View className="flex-row items-center mb-3">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                <Ionicons name="mic" size={20} color="#1F3A5F" />
              </View>
              <Text className="text-base font-bold text-[#1F3A5F]">Interview Practice</Text>
            </View>
            <Text className="text-sm font-medium text-[#4F6B82] leading-5 ml-13">
              Practice mock interviews tailored to your target role and get AI-driven metrics.
            </Text>
          </View>

          <View className="rounded-2xl bg-white p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <View className="flex-row items-center mb-3">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                <Ionicons name="trending-up" size={20} color="#1F3A5F" />
              </View>
              <Text className="text-base font-bold text-[#1F3A5F]">Growth Paths</Text>
            </View>
            <Text className="text-sm font-medium text-[#4F6B82] leading-5 ml-13">
              Discover certifications, seminars, and courses specifically recommended for you.
            </Text>
          </View>

          {/* Consents & Agreements */}
          <View className="mt-4 p-4 rounded-2xl bg-white border border-[#BFD6EA] gap-3" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <View className="flex-row items-start">
              <TouchableOpacity
                onPress={() => setAgreeTerms(!agreeTerms)}
                className="mt-0.5 mr-3 h-6 w-6 items-center justify-center rounded-lg border border-[#BFD6EA] bg-[#F4F8FB]"
              >
                {agreeTerms && <Ionicons name="checkmark" size={16} color="#CA5D25" />}
              </TouchableOpacity>
              <View className="flex-1 flex-row flex-wrap items-center">
                <Text className="text-sm text-[#4F6B82]">I agree to the </Text>
                <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                  <Text className="text-sm font-bold text-[#CA5D25] underline">Terms of Service</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row items-start">
              <TouchableOpacity
                onPress={() => setAgreePrivacy(!agreePrivacy)}
                className="mt-0.5 mr-3 h-6 w-6 items-center justify-center rounded-lg border border-[#BFD6EA] bg-[#F4F8FB]"
              >
                {agreePrivacy && <Ionicons name="checkmark" size={16} color="#CA5D25" />}
              </TouchableOpacity>
              <View className="flex-1 flex-row flex-wrap items-center">
                <Text className="text-sm text-[#4F6B82]">I agree to the </Text>
                <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
                  <Text className="text-sm font-bold text-[#CA5D25] underline">Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action button in scroll flow */}
          <View className="mt-6">
            <PrimaryButton
              title="Go to Dashboard"
              variant="orange"
              onPress={handleContinue}
              loading={authLoading}
              disabled={!agreeTerms || !agreePrivacy || authLoading}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modals for Terms and Privacy */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="h-4/5 rounded-t-3xl bg-white p-6 shadow-lg">
            <View className="flex-row items-center justify-between border-b border-[#EAF2F7] pb-4">
              <Text className="text-xl font-extrabold text-[#1F3A5F]">Terms of Service</Text>
              <TouchableOpacity onPress={() => setShowTermsModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8B95A5" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4 flex-1 pr-2" showsVerticalScrollIndicator={true}>
              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">1. Acceptance of Terms</Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                By using AIRIS, you agree to these Terms of Service. If you do not agree, you must
                not use the application.
              </Text>

              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">
                2. Career Readiness Purpose
              </Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                AIRIS provides resume parsing and AI interview feedback to enhance student
                employability. The results, advice, and preparedness scores generated by the
                application are for educational and mock simulation purposes only. They do not
                guarantee job offers or official employment placement.
              </Text>

              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">
                3. User Responsibilities
              </Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                You are responsible for ensuring the details you submit are accurate. You agree not
                to submit offensive, plagiarized, or false content during mock interview practice or
                resume upload.
              </Text>
            </ScrollView>

            <View className="pt-4 border-t border-[#EAF2F7]">
              <PrimaryButton
                title="Agree & Close"
                variant="orange"
                onPress={() => {
                  setAgreeTerms(true);
                  setShowTermsModal(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="h-4/5 rounded-t-3xl bg-white p-6 shadow-lg">
            <View className="flex-row items-center justify-between border-b border-[#EAF2F7] pb-4">
              <Text className="text-xl font-extrabold text-[#1F3A5F]">Privacy Policy</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} className="p-1">
                <Ionicons name="close" size={24} color="#8B95A5" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mt-4 flex-1 pr-2" showsVerticalScrollIndicator={true}>
              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">1. Data We Collect</Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                We collect profile data including your name, TIP email, college, degree program, and
                target job roles. We parse resume details and mock interview transcripts locally or
                securely send them to processors to generate feedback.
              </Text>

              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">2. How We Use Data</Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                Your data is exclusively used to tailor your employability score, customize mock
                questions, and provide actionable feedback. We do not sell or monetize student data.
              </Text>

              <Text className="text-sm font-bold text-[#1F3A5F] mb-2 uppercase tracking-wider">3. Storage & Deletion</Text>
              <Text className="text-sm leading-6 text-[#4F6B82] mb-6">
                Resume data is parsed and stored inside Firestore under your authenticated user
                record. You retain complete ownership and can request account removal or delete
                entries at any time.
              </Text>
            </ScrollView>

            <View className="pt-4 border-t border-[#EAF2F7]">
              <PrimaryButton
                title="Agree & Close"
                variant="orange"
                onPress={() => {
                  setAgreePrivacy(true);
                  setShowPrivacyModal(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
