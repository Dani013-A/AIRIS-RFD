import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { BackHandler, Image, ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "../../components/ui/AppText";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const authLoading = useAuthStore((state) => state.loading);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(student)/position-selection");
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

  const handleContinue = () => {
    router.replace("/(student)/(tabs)/dashboard" as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB]" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between px-6 pt-2 pb-2">
        <TouchableOpacity onPress={handleGoBack} className="flex-row items-center py-2">
          <Ionicons name="arrow-back" size={24} color="#1F3A5F" />
          <Text className="text-[#1F3A5F] font-bold ml-1 text-base">Target Role</Text>
        </TouchableOpacity>
        <Text className="text-xs font-bold text-[#4F6B82] uppercase tracking-wider">Welcome</Text>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 36) }}
      >
        <View className="items-center px-6 pt-10 pb-8 bg-[#CFE0EC] rounded-b-[40px] border-b border-[#BFD6EA] mb-6">
          <Image
            source={require("../../../assets/images/airis-logo-final.png")}
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
              Upload your resume for machine-level extraction and ATS scoring grounded directly in your evidence.
            </Text>
          </View>

          <View className="rounded-2xl bg-white p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <View className="flex-row items-center mb-3">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                <Ionicons name="analytics" size={20} color="#1F3A5F" />
              </View>
              <Text className="text-base font-bold text-[#1F3A5F]">Target Role Alignment</Text>
            </View>
            <Text className="text-sm font-medium text-[#4F6B82] leading-5 ml-13">
              Compare your evidenced competencies against professional benchmarks for your chosen career.
            </Text>
          </View>

          <View className="rounded-2xl bg-white p-5 border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <View className="flex-row items-center mb-3">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#EAF2F7]">
                <Ionicons name="school" size={20} color="#1F3A5F" />
              </View>
              <Text className="text-base font-bold text-[#1F3A5F]">Personalized Growth Path</Text>
            </View>
            <Text className="text-sm font-medium text-[#4F6B82] leading-5 ml-13">
              Access verified learning resources and certifications designed to bridge specific skill gaps.
            </Text>
          </View>

          {/* Action button in scroll flow */}
          <View className="mt-6">
            <PrimaryButton
              title="Go to Dashboard"
              variant="orange"
              onPress={handleContinue}
              loading={authLoading}
              disabled={authLoading}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
