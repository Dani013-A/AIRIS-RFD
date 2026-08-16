import React from "react";
import { Stack } from "expo-router";

export default function InterviewSessionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="briefing" />
      <Stack.Screen name="active" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
