import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
    if (!isPasswordSecure) return passwordVal.message || "Password does not meet requirements.";
    return "";
  })();

  const confirmPasswordWarning = (() => {
    if (!touched.passwordConfirm) return "";
    if (!passwordConfirm) return "Please confirm your password.";
    if (password !== passwordConfirm) return "Passwords do not match.";
    return "";
  })();

  const isFormValid =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
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

    const normalizedEmail = email.trim().toLowerCase();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    await register(normalizedEmail, password, fullName);
  };

  const handleGoogleLogin = async () => {
    clearError();
    try {
      await loginWithGoogle();
    } catch {
      console.warn("Google authentication process complete with error outcome.");
    }
  };

  const handleGoToLogin = () => {
    clearRegistrationSuccess();
    router.replace("/(auth)/login");
  };

  React.useEffect(() => {
    if (registrationSuccess) {
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setFirstName("");
      setLastName("");
      setTouched({});
    }
  }, [registrationSuccess]);

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
          Create your account
        </Text>
      </View>

      <View className="mb-8 flex-row rounded-xl bg-[#EAF2F7] p-1 border border-[#BFD6EA]">
        <TouchableOpacity
          className="flex-1 rounded-lg py-2.5 items-center justify-center"
          onPress={() => router.replace("/login")}
        >
          <Text className="text-center text-sm font-semibold text-[#4F6B82]">Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 rounded-lg bg-white py-2.5 items-center justify-center border border-[#BFD6EA]" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}>
          <Text className="text-center text-sm font-bold text-[#1F3A5F]">Sign Up</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-6">
        <View
          className={`mb-2 flex-row items-center rounded-xl bg-white px-4 h-14 border ${
            firstNameWarning ? "border-[#CA5D25]" : "border-[#BFD6EA]"
          }`}
        >
          <Ionicons name="person-outline" size={20} color={firstNameWarning ? "#CA5D25" : "#4F6B82"} />
          <TextInput
            className="ml-3 flex-1 text-base text-[#1F3A5F]"
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
            className="ml-3 flex-1 text-base text-[#1F3A5F]"
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
            className="ml-3 flex-1 text-base text-[#1F3A5F]"
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

      <Modal
        visible={registrationSuccess}
        transparent
        animationType="fade"
        onRequestClose={handleGoToLogin}
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
              onPress={handleGoToLogin}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollView>
  );
}
