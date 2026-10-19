import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "./AppText";

export type CaptureStatus = "listening" | "processing" | "ready" | "error" | "idle";

const CONFIG: Record<
  CaptureStatus,
  { dot: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; text: string; spin: boolean }
> = {
  listening: { dot: "#D32F2F", icon: "mic", iconColor: "#D32F2F", text: "text-[#D32F2F]", spin: false },
  processing: { dot: "#F59E0B", icon: "hourglass-outline", iconColor: "#B45309", text: "text-[#B45309]", spin: true },
  ready: { dot: "#1E5D53", icon: "checkmark-circle", iconColor: "#1E5D53", text: "text-[#1E5D53]", spin: false },
  error: { dot: "#D32F2F", icon: "alert-circle", iconColor: "#D32F2F", text: "text-[#D32F2F]", spin: false },
  idle: { dot: "#8B95A5", icon: "mic-outline", iconColor: "#4F6B82", text: "text-[#4F6B82]", spin: false },
};

interface CaptureStatusPillProps {
  status: CaptureStatus;
  label: string;
  dark?: boolean;
}

/**
 * Single shared response-capture indicator for standard and Unity interviews.
 * Color/wording/icon are fixed per status; the label describes the moment.
 * Color is never the only signal: icon + explicit text always accompany it.
 */
export function CaptureStatusPill({ status, label, dark = false }: CaptureStatusPillProps) {
  const config = CONFIG[status];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Capture status: ${label}`}
      className={`flex-row items-center self-start px-3 py-1.5 rounded-full border ${
        dark ? "bg-white border-white" : "bg-white border-[#BFD6EA]"
      }`}
      style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: config.dot,
          marginRight: 6,
        }}
      />
      {config.spin ? (
        <ActivityIndicator size="small" color={config.iconColor} style={{ marginRight: 6 }} />
      ) : (
        <Ionicons name={config.icon} size={14} color={config.iconColor} style={{ marginRight: 6 }} />
      )}
      <Text className={`text-xs font-bold ${config.text}`}>{label}</Text>
    </View>
  );
}
