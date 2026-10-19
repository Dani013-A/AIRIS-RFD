import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { Text } from "../ui/AppText";
import { formatSkillDisplayName } from "../../utils/displayNames";
import { groupGuidanceItems, type GuidanceInput } from "../../utils/groupGuidance";

export type GuidanceTone = "success" | "warning" | "danger";

const TONES: Record<
  GuidanceTone,
  { card: string; border: string; heading: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; actionBorder: string }
> = {
  success: {
    card: "bg-[#F8FAFC]",
    border: "border-[#E2E8F0]",
    heading: "text-[#1E5D53]",
    icon: "checkmark-circle",
    iconColor: "#1E5D53",
    actionBorder: "border-[#E2E8F0]",
  },
  warning: {
    card: "bg-[#FFF8F5]",
    border: "border-[#FDEEE6]",
    heading: "text-[#CA5D25]",
    icon: "warning",
    iconColor: "#CA5D25",
    actionBorder: "border-[#FDEEE6]",
  },
  danger: {
    card: "bg-[#FEF2F2]",
    border: "border-[#FCA5A5]/40",
    heading: "text-[#D32F2F]",
    icon: "close-circle",
    iconColor: "#D32F2F",
    actionBorder: "border-[#FCA5A5]/30",
  },
};

interface CompetencyGuidanceGroupProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone: GuidanceTone;
  items: GuidanceInput[];
}

/**
 * One visually organized card per shared-evidence group.
 * Related skills share a single evidence quote and a single shared
 * recommendation; per-skill text is preserved only where it differs.
 */
export function CompetencyGuidanceGroup({ title, icon, tone, items }: CompetencyGuidanceGroupProps) {
  const theme = TONES[tone];
  if (items.length === 0) return null;
  const groups = groupGuidanceItems(items);

  return (
    <View className="mb-4">
      <View className="flex-row items-center mb-2.5">
        <Ionicons name={icon ?? theme.icon} size={15} color={theme.iconColor} />
        <Text className={`ml-1.5 text-[11px] font-bold uppercase tracking-widest ${theme.heading}`}>
          {title} ({items.length})
        </Text>
      </View>
      <View className="gap-3">
        {groups.map((group, gi) => (
          <View key={gi} className={`${theme.card} p-3.5 rounded-xl border ${theme.border}`}>
            <Text className="text-xs font-bold text-[#1F3A5F] mb-1">
              Skills: {group.skills.map(formatSkillDisplayName).join(", ")}
            </Text>

            {group.evidence ? (
              <Text className="text-[11px] text-[#4F6B82] mt-1.5 italic leading-4">
                Evidence from your resume: &quot;{group.evidence}&quot;
              </Text>
            ) : null}

            {group.sharedMeaning ? (
              <Text className="text-xs text-[#4F6B82] leading-4 mt-1.5">
                <Text className="font-bold">What this means: </Text>
                {group.sharedMeaning}
              </Text>
            ) : null}
            {group.meaningBySkill
              ? group.meaningBySkill.map((entry) => (
                  <Text key={entry.skill} className="text-xs text-[#4F6B82] leading-4 mt-1.5">
                    <Text className="font-bold">{formatSkillDisplayName(entry.skill)}: </Text>
                    {entry.text}
                  </Text>
                ))
              : null}

            {group.sharedAction ? (
              <View className={`bg-white p-2.5 rounded-lg border ${theme.actionBorder} mt-2`}>
                <Text className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-wider mb-0.5">
                  Recommended action
                </Text>
                <Text className="text-xs text-[#4F6B82] leading-4">{group.sharedAction}</Text>
              </View>
            ) : null}
            {group.actionBySkill
              ? group.actionBySkill.map((entry) => (
                  <View key={entry.skill} className={`bg-white p-2.5 rounded-lg border ${theme.actionBorder} mt-2`}>
                    <Text className="text-[10px] font-bold text-[#1F3A5F] uppercase tracking-wider mb-0.5">
                      {formatSkillDisplayName(entry.skill)} — next step
                    </Text>
                    <Text className="text-xs text-[#4F6B82] leading-4">{entry.text}</Text>
                  </View>
                ))
              : null}
          </View>
        ))}
      </View>
    </View>
  );
}
