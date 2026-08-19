import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";

import { useEffect } from "react";
import { ActivityIndicator, AppState, AppStateStatus, View } from "react-native";
import { useAuthStore } from "../src/store/authStore";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useOnboardingStore } from "../src/store/onboardingStore";

let GoogleSignin: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
} catch {
  // Prevent crash in simulator without Google Sign-In.
}

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
if (GoogleSignin) {
  if (!googleWebClientId) {
    console.warn(
      "Warning: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured in the environment. Google Sign-In will fail."
    );
  } else {
    GoogleSignin.configure({
      webClientId: googleWebClientId,
    });
  }
}

export const unstable_settings = {
  anchor: "(auth)",
};

let lastSessionValidationTime = 0;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const currentUser = useAuthStore((state) => state.currentUser);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    const unsubscribe = initializeAuth();

    return unsubscribe;
  }, [initializeAuth]);

  // Copy profile into setup helper.
  useEffect(() => {
    if (currentUser) {
      const onboarding = useOnboardingStore.getState();
      if (currentUser.college && onboarding.college !== currentUser.college) {
        useOnboardingStore.setState({ college: currentUser.college });
      }
      if (currentUser.degreeProgram && onboarding.degreeProgram !== currentUser.degreeProgram) {
        useOnboardingStore.setState({ degreeProgram: currentUser.degreeProgram });
      }
      if (currentUser.targetPosition && onboarding.targetPosition !== currentUser.targetPosition) {
        useOnboardingStore.setState({ targetPosition: currentUser.targetPosition });
      }
    }
  }, [currentUser]);

  // Re-verify account on app focus.
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && useAuthStore.getState().currentUser) {
        await useAuthStore.getState().checkSessionValidity();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inStudentGroup = segments[0] === "(student)";
    const currentSegment = (segments as string[])[1] || "";

    if (!currentUser) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }

    // Logout on corrupt profile.
    if (!currentUser.uid || !currentUser.email) {
      useAuthStore.getState().logout().then(() => {
        router.replace("/(auth)/login");
      });
      return;
    }

    // Verify login periodically.
    if (!inAuthGroup) {
      const now = Date.now();
      // Rate limit checks to 10s.
      if (now - lastSessionValidationTime > 10000) {
        lastSessionValidationTime = now;
        useAuthStore.getState().checkSessionValidity();
      }
    }

    // Ensure profile is complete before proceeding.
    const hasMissingSetupFields = !currentUser.college || !currentUser.degreeProgram || !currentUser.targetPosition;
    const setupIncomplete = currentUser.hasCompletedInitialSetup !== true || hasMissingSetupFields;

    if (setupIncomplete) {
      if (!currentUser.college) {
        if (!inStudentGroup || currentSegment !== "college-selection") {
          router.replace("/(student)/college-selection");
        }
      } else if (!currentUser.degreeProgram) {
        if (!inStudentGroup || currentSegment !== "program-selection") {
          router.replace("/(student)/program-selection");
        }
      } else {
        if (!inStudentGroup || currentSegment !== "position-selection") {
          router.replace("/(student)/position-selection");
        }
      }
      return;
    }

    if (currentUser.hasCompletedOnboarding !== true) {
      const allowedOnboardingPages = ["onboarding", "resume-upload"];
      if (!inStudentGroup || !allowedOnboardingPages.includes(currentSegment)) {
        router.replace("/(student)/onboarding");
      }
      return;
    }

    // Redirect to dashboard if onboarded.
    if (inAuthGroup) {
      router.replace("/(student)/(tabs)/dashboard" as any);
    }
  }, [currentUser, isInitialized, segments, router]);

  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-[#BFD6EA]">
        <ActivityIndicator size="large" color="#F4A47A" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(student)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
