import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { BackHandler, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";

export default function OnboardingScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);

  React.useEffect(() => {
    const onBackPress = () => {
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleContinue = () => {
    router.push("/(student)/resume-upload");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8FB]" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
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
          <Text className="text-center text-sm font-bold text-[#F4A47A] uppercase tracking-widest mb-4">
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

          <View className="rounded-2xl bg-[#FEF5F1] p-5 border border-[#FDEEE6]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <View className="flex-row items-center mb-3">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                <Ionicons name="mic" size={20} color="#CA5D25" />
              </View>
              <Text className="text-base font-bold text-[#CA5D25]">Interview Practice</Text>
            </View>
            <Text className="text-sm font-medium text-[#CA5D25] opacity-90 leading-5 ml-13">
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
        </View>
      </ScrollView>

      <View className="absolute bottom-6 left-6 right-6">
        <PrimaryButton
          title="Continue"
          variant="navy"
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
