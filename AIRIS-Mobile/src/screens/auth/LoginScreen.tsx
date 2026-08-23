import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PrimaryButton, SecondaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const loading = useAuthStore((state) => state.loading);
  const isGoogleLoading = useAuthStore((state) => state.isGoogleLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const emailNotVerified = useAuthStore((state) => state.emailNotVerified);
  const clearEmailNotVerified = useAuthStore((state) => state.clearEmailNotVerified);
  const resendVerification = useAuthStore((state) => state.resendVerification);

  const [passwordVisible, setPasswordVisible] = useState(false);
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const emailWarning = (() => {
    if (!touched.email) return "";
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return "Email address is required.";
    if (!trimmed.includes("@")) return "Please enter a valid email address.";
    if (!trimmed.endsWith("@tip.edu.ph")) return "Only @tip.edu.ph emails are allowed.";
    return "";
  })();

  const passwordWarning = (() => {
    if (!touched.password) return "";
    if (!password) return "Password is required.";
    return "";
  })();

  const isFormValid = email.trim().toLowerCase().endsWith("@tip.edu.ph") && password.length > 0;

  const handleLogin = async () => {
    setTouched({ email: true, password: true });

    if (!isFormValid) return;

    clearError();
    clearEmailNotVerified();

    await login(email, password);

    const currentUser = useAuthStore.getState().currentUser;

    if (currentUser) {
      if (!currentUser.hasCompletedOnboarding) {
        router.replace("/(student)/onboarding");
      } else {
        router.replace("/(student)/(tabs)/dashboard" as any);
      }
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    clearEmailNotVerified();

    try {
      await loginWithGoogle();
    } catch {
      console.warn("Google authentication process complete with error outcome.");
    }
  };

  const handleResendVerification = async () => {
    await resendVerification();

    const storeState = useAuthStore.getState();

    if (!storeState.error) {
      Alert.alert(
        "Verification Email Sent",
        "We sent a new verification link to your TIP email. Please check your inbox.",
      );
    }
  };

  const handleDismissVerificationModal = () => {
    clearEmailNotVerified();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#F4F8FB]"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-8 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-8">
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
          <Text className="text-4xl font-extrabold tracking-tight text-[#1F3A5F]">AIRIS</Text>
          <Text className="mt-2 text-center text-sm font-medium text-[#4F6B82]">
            Resume Analysis & Interview Simulation
          </Text>
        </View>

        <View className="mb-8 flex-row rounded-xl bg-[#EAF2F7] p-1 border border-[#BFD6EA]">
          <TouchableOpacity className="flex-1 rounded-lg bg-white py-2.5 items-center justify-center border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}>
            <Text className="text-center text-sm font-bold text-[#1F3A5F]">Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded-lg py-2.5 items-center justify-center"
            onPress={() => router.push("/register")}
          >
            <Text className="text-center text-sm font-semibold text-[#4F6B82]">Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-6">
          <View
            className={`mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border ${
              emailWarning ? "border-[#CA5D25]" : "border-[#BFD6EA]"
            }`}
          >
            <Ionicons name="mail-outline" size={20} color={emailWarning ? "#CA5D25" : "#4F6B82"} />
            <TextInput
              className="ml-3 flex-1 text-base text-[#1F3A5F]"
              placeholder="TIP Email Address"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              onBlur={() => handleBlur("email")}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {emailWarning ? (
            <Text className="mb-4 ml-1 text-xs font-medium text-[#CA5D25]">{emailWarning}</Text>
          ) : null}

          <View
            className={`mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border ${
              passwordWarning ? "border-[#CA5D25]" : "border-[#BFD6EA]"
            }`}
          >
            <Ionicons name="lock-closed-outline" size={20} color={passwordWarning ? "#CA5D25" : "#4F6B82"} />
            <TextInput
              className="ml-3 flex-1 text-base text-[#1F3A5F]"
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              onBlur={() => handleBlur("password")}
              secureTextEntry={!passwordVisible}
            />
            <TouchableOpacity onPress={() => setPasswordVisible((value) => !value)} className="p-2 -mr-2">
              <Ionicons
                name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#8B95A5"
              />
            </TouchableOpacity>
          </View>
          {passwordWarning ? (
            <Text className="mb-4 ml-1 text-xs font-medium text-[#CA5D25]">{passwordWarning}</Text>
          ) : null}

          <TouchableOpacity
            className="self-end mt-2"
            onPress={() => router.push("/forgot-password")}
          >
            <Text className="text-sm font-semibold text-[#F4A47A]">Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View className="mb-6 p-4 bg-[#FEF5F1] rounded-xl border border-[#FDEEE6]">
            <Text className="text-sm font-medium text-center text-[#CA5D25]">{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          title="Log In"
          variant="orange"
          onPress={handleLogin}
          loading={loading}
          disabled={loading || isGoogleLoading || (!isFormValid && (touched.email || touched.password))}
          className="mb-8"
        />

        <View className="flex-row items-center mb-8">
          <View className="flex-1 h-[1px] bg-[#BFD6EA]" />
          <Text className="px-4 text-xs font-semibold text-[#4F6B82] uppercase tracking-wider">Or continue with</Text>
          <View className="flex-1 h-[1px] bg-[#BFD6EA]" />
        </View>

        <TouchableOpacity
          className={`flex-row items-center justify-center rounded-xl bg-white h-14 border border-[#BFD6EA] ${(isGoogleLoading || loading) ? "opacity-50" : ""}`}
          onPress={handleGoogleLogin}
          disabled={isGoogleLoading || loading}
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <Text className="mr-3 text-2xl font-black text-[#4285F4]">G</Text>
              <Text className="text-sm font-bold text-[#1F3A5F]">Google Account</Text>
            </>
          )}
        </TouchableOpacity>

        <Text className="mt-4 text-center text-xs font-medium text-[#4F6B82]">
          Use your verified @tip.edu.ph account.
        </Text>
      </ScrollView>

      <Modal
        visible={emailNotVerified}
        transparent
        animationType="fade"
        onRequestClose={handleDismissVerificationModal}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="w-full rounded-3xl bg-white p-8">
            <View className="items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#FEF5F1]">
                <Ionicons name="warning-outline" size={32} color="#CA5D25" />
              </View>

              <Text className="text-xl font-bold text-[#1F3A5F] mb-3">
                Email Not Verified
              </Text>

              <Text className="text-center text-sm leading-5 text-[#4F6B82] mb-8">
                Please verify your TIP email before continuing. Check your inbox for the
                verification link.
              </Text>
            </View>

            <PrimaryButton
              title="Resend Verification"
              variant="orange"
              onPress={handleResendVerification}
              loading={loading}
              className="mb-4"
            />

            <SecondaryButton
              title="Back to Login"
              onPress={handleDismissVerificationModal}
              disabled={loading}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
