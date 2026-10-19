import React from "react";
import { View } from "react-native";
import { Text } from "./AppText";

export type TagVariant = "success" | "warning" | "neutral" | "muted" | "info";

const VARIANTS: Record<TagVariant, { container: string; text: string }> = {
  success: {
    container: "bg-[#D7F1ED]/40 border-[#79D5C8]/50",
    text: "text-[#1E5D53]",
  },
  warning: {
    container: "bg-[#FEF5F1] border-[#F4A47A]",
    text: "text-[#CA5D25]",
  },
  neutral: {
    container: "bg-white border-[#BFD6EA]",
    text: "text-[#1F3A5F]",
  },
  muted: {
    container: "bg-[#F4F8FB] border-[#EAF2F7]",
    text: "text-[#4F6B82]",
  },
  info: {
    container: "bg-[#EAF2F7] border-[#BFD6EA]",
    text: "text-[#1F3A5F]",
  },
};

interface TagProps {
  label: string;
  variant?: TagVariant;
  bold?: boolean;
}

/**
 * Shared non-interactive tag for wrapping label groups
 * (skills, sections, gaps, strengths, filters).
 * Natural width, consistent padding/radius/text, wraps in flex rows.
 * Color is never the only signal: labels always carry readable text.
 */
export function Tag({ label, variant = "neutral", bold = true }: TagProps) {
  const current = VARIANTS[variant];
  return (
    <View className={`px-2.5 py-1 rounded-lg border ${current.container}`}>
      <Text
        className={`text-[11px] ${bold ? "font-bold" : "font-medium"} ${current.text}`}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
}
