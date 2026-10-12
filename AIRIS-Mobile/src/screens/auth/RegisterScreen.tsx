import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import { Text, TextInput } from "../../components/ui/AppText";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { PrimaryButton, SecondaryButton } from "../../components/ui";
import { PasswordRequirementsView } from "../../components/ui/PasswordRequirementsView";
import { useAuthStore } from "../../store/authStore";
import { validatePassword } from "../../utils/passwordPolicy";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const registrationSuccess = useAuthStore((state) => state.registrationSuccess);
  const clearRegistrationSuccess = useAuthStore((state) => state.clearRegistrationSuccess);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const isGoogleLoading = useAuthStore((state) => state.isGoogleLoading);

  // Student OTP Verification Hooks
  const isOtpRequired = useAuthStore((state) => state.isOtpRequired);
  const otpMaskedEmail = useAuthStore((state) => state.otpMaskedEmail);
  const otpCooldownRemaining = useAuthStore((state) => state.otpCooldownRemaining);
  const otpError = useAuthStore((state) => state.otpError);
  const isOtpVerifying = useAuthStore((state) => state.isOtpVerifying);
  const verifyStudentOtpAction = useAuthStore((state) => state.verifyStudentOtpAction);
  const resendStudentOtpAction = useAuthStore((state) => state.resendStudentOtpAction);
  const cancelStudentOtpAction = useAuthStore((state) => state.cancelStudentOtpAction);
  const clearOtpError = useAuthStore((state) => state.clearOtpError);
  const pendingGoogleEmail = useAuthStore((state) => state.pendingGoogleEmail);
  const clearPendingGoogleEmail = useAuthStore((state) => state.clearPendingGoogleEmail);

  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (isOtpRequired) {
      setCooldown(otpCooldownRemaining || 60);
      setOtpCode("");
    }
  }, [isOtpRequired, otpCooldownRemaining]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    const success = await verifyStudentOtpAction(otpCode);
    if (success) {
      clearPendingGoogleEmail();
      const currentUser = useAuthStore.getState().currentUser;
      if (currentUser) {
        if (!currentUser.hasCompletedOnboarding) {
          router.replace("/(student)/onboarding");
        } else {
          router.replace("/(student)/(tabs)/dashboard" as any);
        }
      }
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    const ok = await resendStudentOtpAction();
    if (ok) {
      setCooldown(60);
    }
  };

  const handleCancelOtp = async () => {
    setOtpCode("");
    await cancelStudentOtpAction();
  };

  React.useEffect(() => {
    clearError();
    clearRegistrationSuccess();
    clearOtpError();
    return () => {
      clearError();
      clearRegistrationSuccess();
      clearOtpError();
      clearPendingGoogleEmail();
    };
  }, [clearError, clearRegistrationSuccess, clearOtpError, clearPendingGoogleEmail]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };
  const firstNameWarning = touched.firstName && !firstName.trim() ? "First name is required." : "";

  const lastNameWarning = touched.lastName && !lastName.trim() ? "Last name is required." : "";

  const emailWarning = (() => {
    if (!touched.email) return "";
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return "Email address is required.";
    if (!trimmed.includes("@")) return "Please enter a valid email address.";
    if (!trimmed.endsWith("@tip.edu.ph")) return "Only @tip.edu.ph emails are allowed.";
    return "";
  })();

  const passwordVal = validatePassword(password);
  const isPasswordSecure = passwordVal.isValid;

  const passwordWarning = (() => {
    if (!touched.password) return "";
    if (!password) return "Password is required.";
    if (!isPasswordSecure) return "Password does not meet security requirements.";
    return "";
  })();

  const confirmPasswordWarning = (() => {
    if (!touched.passwordConfirm) return "";
    if (!passwordConfirm) return "Please confirm your password.";
    if (password !== passwordConfirm) return "Passwords do not match.";
    return "";
  })();

  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().toLowerCase().endsWith("@tip.edu.ph") &&
    isPasswordSecure &&
    password === passwordConfirm;

  const handleRegister = async () => {
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      passwordConfirm: true,
    });

    if (!isFormValid) return;

    clearError();
    clearRegistrationSuccess();

    await register(email.trim().toLowerCase(), password, `${firstName.trim()} ${lastName.trim()}`);
  };

  const handleGoogleRegister = async () => {
    clearError();
    clearRegistrationSuccess();

    try {
      await loginWithGoogle(true);
    } catch {
      console.warn("Google registration complete with non-standard status.");
    }
  };

  const handleDismissSuccessModal = () => {
    clearRegistrationSuccess();
    clearError();
    router.replace("/(auth)/login");
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-[#F4F8FB]"
      enableOnAndroid
      extraScrollHeight={120}
      extraHeight={160}
      keyboardOpeningTime={0}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 32,
        paddingTop: 48,
        paddingBottom: 140,
      }}
    >
      <View className="items-center mb-8">
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

        <Text className="text-4xl font-extrabold tracking-tight text-[#1F3A5F]">AIRIS</Text>
        <Text className="mt-2 text-center text-sm font-medium text-[#4F6B82]">
          Create your account
        </Text>
      </View>

      <View className="mb-8 flex-row rounded-xl bg-[#EAF2F7] p-1 border border-[#BFD6EA]">
        <TouchableOpacity
          className="flex-1 rounded-lg py-2.5 items-center justify-center"
          onPress={() => {
            clearError();
            clearRegistrationSuccess();
            router.replace("/(auth)/login");
          }}
        >
          <Text className="text-center text-sm font-semibold text-[#4F6B82]">Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 rounded-lg bg-white py-2.5 items-center justify-center border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}>
          <Text className="text-center text-sm font-bold text-[#1F3A5F]">Sign Up</Text>
        </TouchableOpacity>
      </View>

      {pendingGoogleEmail ? (
        <View className="mb-6 p-4 bg-[#EAF2F7] rounded-xl border border-[#BFD6EA] flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-xs font-semibold text-[#4F6B82]">Continue with selected account:</Text>
            <Text className="text-sm font-bold text-[#1F3A5F]">{pendingGoogleEmail}</Text>
          </View>
          <TouchableOpacity
            className="px-4 py-2 bg-[#1F3A5F] rounded-lg items-center justify-center"
            onPress={handleGoogleRegister}
            disabled={isGoogleLoading || loading}
          >
            <Text className="text-xs font-bold text-white">Continue</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View className="mb-6">
        <View
          className={`mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border ${
            firstNameWarning ? "border-[#CA5D25]" : "border-[#BFD6EA]"
          }`}
        >
          <Ionicons name="person-outline" size={20} color={firstNameWarning ? "#CA5D25" : "#4F6B82"} />
          <TextInput
            className="ml-3 flex-1 h-full text-base text-[#1F3A5F]"
            style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
            placeholder="First Name"
            placeholderTextColor="#94A3B8"
            value={firstName}
            onChangeText={setFirstName}
            onBlur={() => handleBlur("firstName")}
            autoCapitalize="words"
          />
        </View>
        {firstNameWarning ? (
          <Text className="mb-4 ml-1 text-xs font-medium text-[#CA5D25]">{firstNameWarning}</Text>
        ) : null}

        <View
          className={`mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border ${
            lastNameWarning ? "border-[#CA5D25]" : "border-[#BFD6EA]"
          }`}
        >
          <Ionicons name="person-outline" size={20} color={lastNameWarning ? "#CA5D25" : "#4F6B82"} />
          <TextInput
            className="ml-3 flex-1 h-full text-base text-[#1F3A5F]"
            style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
            placeholder="Last Name"
            placeholderTextColor="#94A3B8"
            value={lastName}
            onChangeText={setLastName}
            onBlur={() => handleBlur("lastName")}
            autoCapitalize="words"
          />
        </View>
        {lastNameWarning ? (
          <Text className="mb-4 ml-1 text-xs font-medium text-[#CA5D25]">{lastNameWarning}</Text>
        ) : null}

        <View
          className={`mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border ${
            emailWarning ? "border-[#CA5D25]" : "border-[#BFD6EA]"
          }`}
        >
          <Ionicons name="mail-outline" size={20} color={emailWarning ? "#CA5D25" : "#4F6B82"} />
          <TextInput
            className="ml-3 flex-1 h-full text-base text-[#1F3A5F]"
            style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
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
            className="ml-3 flex-1 h-full text-base text-[#1F3A5F]"
            style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
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

        {touched.password || password.length > 0 ? (
          <PasswordRequirementsView password={password} />
        ) : null}

        <View
          className={`mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border ${
            confirmPasswordWarning ? "border-[#CA5D25]" : "border-[#BFD6EA]"
          }`}
        >
          <Ionicons name="lock-closed-outline" size={20} color={confirmPasswordWarning ? "#CA5D25" : "#4F6B82"} />
          <TextInput
            className="ml-3 flex-1 h-full text-base text-[#1F3A5F]"
            style={{ paddingTop: 0, paddingBottom: 0, paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
            placeholder="Confirm Password"
            placeholderTextColor="#94A3B8"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            onBlur={() => handleBlur("passwordConfirm")}
            secureTextEntry={!confirmPasswordVisible}
          />
          <TouchableOpacity onPress={() => setConfirmPasswordVisible((value) => !value)} className="p-2 -mr-2">
            <Ionicons
              name={confirmPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#8B95A5"
            />
          </TouchableOpacity>
        </View>
        {confirmPasswordWarning ? (
          <Text className="mb-4 ml-1 text-xs font-medium text-[#CA5D25]">{confirmPasswordWarning}</Text>
        ) : null}

        <Text className="mt-2 ml-1 text-xs text-[#4F6B82]">
          Use your official TIP email. Password must meet the security requirements.
        </Text>
      </View>

      {error ? (
        <View className="mb-6 p-4 bg-[#FEF5F1] rounded-xl border border-[#FDEEE6]">
          <Text className="text-sm font-medium text-center text-[#CA5D25]">{error}</Text>
        </View>
      ) : null}

      <PrimaryButton
        title="Create Account"
        variant="orange"
        onPress={handleRegister}
        loading={loading}
        disabled={loading || isGoogleLoading || (!isFormValid && touched.email)}
        className="mb-8"
      />

      <View className="flex-row items-center mb-8">
        <View className="flex-1 h-[1px] bg-[#BFD6EA]" />
        <Text className="px-4 text-xs font-semibold text-[#4F6B82] uppercase tracking-wider">Or continue with</Text>
        <View className="flex-1 h-[1px] bg-[#BFD6EA]" />
      </View>

      <TouchableOpacity
        className={`flex-row items-center justify-center rounded-xl bg-white h-14 border border-[#BFD6EA] ${(isGoogleLoading || loading) ? "opacity-50" : ""}`}
        onPress={handleGoogleRegister}
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

      <Modal
        visible={registrationSuccess}
        transparent
        animationType="fade"
        onRequestClose={handleDismissSuccessModal}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="w-full rounded-3xl bg-white p-8">
            <View className="items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#E8F8F5]">
                <Ionicons name="mail-outline" size={32} color="#79D5C8" />
              </View>

              <Text className="text-xl font-bold text-[#1F3A5F] mb-3">
                Registration Successful
              </Text>

              <Text className="text-center text-sm leading-5 text-[#4F6B82] mb-8">
                We sent a verification link to your TIP email. Please verify your email before
                logging in.
              </Text>
            </View>

            <PrimaryButton
              title="Go to Login"
              variant="orange"
              onPress={handleDismissSuccessModal}
            />
          </View>
        </View>
      </Modal>

      {/* Student Email OTP Verification Modal for Google Registrations */}
      <Modal
        visible={isOtpRequired}
        transparent
        animationType="fade"
        onRequestClose={handleCancelOtp}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="w-full rounded-3xl bg-white p-8">
            <View className="items-center">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#EAF2F7]">
                <Ionicons name="shield-checkmark-outline" size={32} color="#1F3A5F" />
              </View>

              <Text className="text-xl font-bold text-[#1F3A5F] mb-2 text-center">
                Enter Verification Code
              </Text>

              <Text className="text-center text-sm leading-5 text-[#4F6B82] mb-6">
                A 6-digit code was sent to{" "}
                <Text className="font-bold text-[#1F3A5F]">{otpMaskedEmail || "your TIP email"}</Text>.
                Please enter it below to complete authentication:
              </Text>
            </View>

            {otpError ? (
              <View className="mb-4 p-3 bg-[#FEF5F1] rounded-xl border border-[#FDEEE6]">
                <Text className="text-xs font-medium text-center text-[#CA5D25]">{otpError}</Text>
              </View>
            ) : null}

            <View className="mb-6 flex-row items-center rounded-xl bg-white px-4 h-14 border border-[#BFD6EA]">
              <Ionicons name="key-outline" size={20} color="#4F6B82" />
              <TextInput
                className="ml-3 flex-1 h-full text-center text-2xl font-bold tracking-[8px] text-[#1F3A5F]"
                style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', includeFontPadding: false }}
                placeholder="000000"
                placeholderTextColor="#CBD5E1"
                value={otpCode}
                onChangeText={(val) => {
                  clearOtpError();
                  setOtpCode(val.replace(/\D/g, "").slice(0, 6));
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            <PrimaryButton
              title="Verify Code"
              variant="orange"
              onPress={handleVerifyOtp}
              loading={isOtpVerifying}
              disabled={otpCode.length !== 6 || isOtpVerifying}
              className="mb-4"
            />

            <View className="flex-row items-center justify-center mb-6">
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={cooldown > 0 || isOtpVerifying}
                className="py-1 px-2"
              >
                <Text className={`text-sm font-semibold ${cooldown > 0 ? "text-[#94A3B8]" : "text-[#F4A47A]"}`}>
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </Text>
              </TouchableOpacity>
            </View>

            <SecondaryButton
              title="Cancel"
              onPress={handleCancelOtp}
              disabled={isOtpVerifying}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollView>
  );
}
