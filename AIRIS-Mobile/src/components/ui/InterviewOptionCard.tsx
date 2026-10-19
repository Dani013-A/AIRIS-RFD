import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "./AppText";
import { AirisColors, AirisShadow } from "./designTokens";

export interface InterviewOption {
  type: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

interface InterviewOptionCardProps {
  option: InterviewOption;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Single shared layout for the three interview choices.
 * Same icon position, title row, badge placement, padding, radius,
 * border treatment, and selected state. Color accents differ by meaning
 * (standard = neutral blue, immersive = teal) without breaking the grid.
 */
export function InterviewOptionCard({ option, selected, onSelect }: InterviewOptionCardProps) {
  const isImmersive = option.type.startsWith("immersive");
  const accent = isImmersive ? AirisColors.tealDeep : AirisColors.brandStrong;
  const iconBg = selected ? AirisColors.brandSoft : AirisColors.background;
  const iconColor = selected ? AirisColors.brandStrong : AirisColors.body;

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.title}. ${option.description}`}
      className="p-5 rounded-2xl border mb-4 bg-white"
      style={{
        borderColor: selected ? AirisColors.brand : AirisColors.border,
        ...(selected ? AirisShadow.raised : AirisShadow.card),
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-3">
          <View
            className="h-11 w-11 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: iconBg }}
          >
            <Ionicons name={option.icon} size={22} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text
              className="text-base font-extrabold"
              style={{ color: selected ? AirisColors.brandStrong : AirisColors.ink }}
            >
              {option.title}
            </Text>
            {option.badge ? (
              <View className="flex-row items-center mt-1">
                <View
                  className="px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: isImmersive ? AirisColors.tealSoft : AirisColors.brandSoft,
                    borderColor: isImmersive ? AirisColors.teal : AirisColors.brand,
                  }}
                >
                  <Text
                    className="font-bold uppercase tracking-wider"
                    style={{ fontSize: 10, color: isImmersive ? AirisColors.tealDeep : accent }}
                  >
                    {option.badge}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
        <Ionicons
          name={selected ? "radio-button-on" : "radio-button-off"}
          size={24}
          color={selected ? AirisColors.brandStrong : AirisColors.border}
        />
      </View>
      <Text className="text-sm text-[#4F6B82] leading-5 font-medium mt-3">
        {option.description}
      </Text>
    </TouchableOpacity>
  );
}
