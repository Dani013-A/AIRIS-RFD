import { Stack } from "expo-router";

export default function StudentLayout() {
  return (
    <Stack>
      <Stack.Screen name="college-selection" options={{ headerShown: false }} />
      <Stack.Screen name="program-selection" options={{ headerShown: false }} />
      <Stack.Screen name="position-selection" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="resume-upload" options={{ headerShown: false }} />
      <Stack.Screen name="resume-view" options={{ headerShown: false }} />
      <Stack.Screen name="interview-session" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
