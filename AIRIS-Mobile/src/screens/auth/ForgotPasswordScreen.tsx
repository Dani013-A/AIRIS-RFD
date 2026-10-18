import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/ui/AppText";
import { PrimaryButton, SecondaryButton } from "../../components/ui";
import { useAuthStore } from "../../store/authStore";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const sendPasswordReset = useAuthStore((state) => state.sendPasswordReset);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const passwordResetSuccess = useAuthStore((state) => state.passwordResetSuccess);
  const clearPasswordResetSuccess = useAuthStore((state) => state.clearPasswordResetSuccess);

  React.useEffect(() => {
    clearError();
    clearPasswordResetSuccess();
    return () => {
      clearError();
      clearPasswordResetSuccess();
    };
  }, [clearError, clearPasswordResetSuccess]);

  const handleBlur = () => {
    setTouched(true);
  };

  const emailWarning = (() => {
    if (!touched) return "";
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return "Email address is required.";
    if (!trimmed.includes("@")) return "Please enter a valid email address.";
    if (!trimmed.endsWith("@tip.edu.ph")) return "Only @tip.edu.ph emails are allowed.";
    return "";
  })();

  const isFormValid = email.trim().toLowerCase().endsWith("@tip.edu.ph");

  const handleResetRequest = async () => {
    setTouched(true);
    if (!isFormValid) return;

    clearError();
    clearPasswordResetSuccess();

    try {
      await sendPasswordReset(email);
    } catch {
      // Any password reset errors are handled and saved in our authentication system.
    }
  };

  const handleBackToLogin = () => {
    clearError();
    clearPasswordResetSuccess();
    router.replace("/login");
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
        <View className="items-center mb-10">
          <View className="mb-4 h-24 w-24 rounded-full bg-white items-center justify-center border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
            <Ionicons name="lock-closed" size={40} color="#1F3A5F" />
          </View>

          <Text className="text-3xl font-extrabold tracking-tight text-[#1F3A5F]">Reset Password</Text>
          <Text className="mt-3 text-center text-sm font-medium text-[#4F6B82] leading-6 px-4">
            {!passwordResetSuccess
              ? "Enter your registered T.I.P. email address below and we'll send you a link to reset your password."
              : "A reset link has been sent to your email."}
          </Text>
        </View>

        {!passwordResetSuccess ? (
          <View>
            <View
              className={`mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border ${
                emailWarning ? "border-[#CA5D25]" : "border-[#BFD6EA]"
              }`}
            >
              <Ionicons name="mail-outline" size={20} color={emailWarning ? "#CA5D25" : "#4F6B82"} />
              <TextInput
                className="ml-3 flex-1 h-full text-base text-[#1F3A5F]"
                style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
                placeholder="T.I.P. Email Address"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                onBlur={handleBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
            {emailWarning ? (
              <Text className="mb-4 ml-1 text-xs font-medium text-[#CA5D25]">{emailWarning}</Text>
            ) : <View className="mb-6" />}

            {error ? (
              <View className="mb-6 p-4 bg-[#FEF5F1] rounded-xl border border-[#FDEEE6]">
                <Text className="text-sm font-medium text-center text-[#CA5D25]">{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              title="Send Reset Link"
              variant="orange"
              onPress={handleResetRequest}
              loading={loading}
              disabled={!isFormValid || loading}
              className="mb-8"
            />
          </View>
        ) : (
          <View className="mb-10 items-center bg-white p-6 rounded-2xl border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#E8F8F5]">
              <Ionicons name="checkmark" size={32} color="#79D5C8" />
            </View>
            <Text className="text-center text-sm font-medium text-[#4F6B82] leading-6">
              Check your inbox at <Text className="font-bold text-[#1F3A5F]">{email.trim().toLowerCase()}</Text> for instructions.
            </Text>
          </View>
        )}

        <SecondaryButton
          title="Back to Login"
          onPress={handleBackToLogin}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
