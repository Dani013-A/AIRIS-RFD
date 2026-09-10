import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { MatchedResourceItem, ResourceType } from "../../types/learning.types";

interface ResourceCardProps {
  resource: MatchedResourceItem;
  onPress?: (resource: MatchedResourceItem) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onPress }) => {
  const [imageError, setImageError] = useState(false);

  const handleOpenLink = async () => {
    if (onPress) {
      onPress(resource);
      return;
    }
    if (!resource.url) {
      Alert.alert("Resource Unavailable", "No valid URL provided for this resource.");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(resource.url);
    } catch {
      Alert.alert("Link Error", "Could not launch external resource.");
    }
  };

  const getCtaLabel = (type: ResourceType) => {
    switch (type) {
      case "video":
        return "Watch Tutorial";
      case "certification":
        return "View Certification";
      case "seminar":
        return "Explore Seminar";
      case "guide":
        return "Read Guide";
      case "documentation":
        return "Read Documentation";
      case "practice":
        return "Start Practice";
      case "course":
      default:
        return "View Course";
    }
  };

  const getTypeTheme = (type: ResourceType) => {
    switch (type) {
      case "video":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-700",
          icon: "play-circle" as const,
          label: "Video Tutorial",
        };
      case "certification":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-700",
          icon: "ribbon" as const,
          label: "Official Credential",
        };
      case "seminar":
        return {
          bg: "bg-rose-50",
          border: "border-rose-200",
          text: "text-rose-700",
          icon: "calendar" as const,
          label: "Tech Event / Seminar",
        };
      case "guide":
      case "documentation":
        return {
          bg: "bg-emerald-50",
          border: "border-emerald-200",
          text: "text-emerald-700",
          icon: "book" as const,
          label: "Guide / Documentation",
        };
      case "practice":
        return {
          bg: "bg-purple-50",
          border: "border-purple-200",
          text: "text-purple-700",
          icon: "code-working" as const,
          label: "Hands-on Practice",
        };
      case "course":
      default:
        return {
          bg: "bg-[#EAF2F7]",
          border: "border-[#BFD6EA]",
          text: "text-[#1F3A5F]",
          icon: "school" as const,
          label: "Course / Tutorial",
        };
    }
  };

  const typeTheme = getTypeTheme(resource.type);

  return (
    <View
      className="rounded-2xl bg-white border border-[#BFD6EA] overflow-hidden mb-4"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      {/* THUMBNAIL / PREVIEW IMAGE CONTAINER */}
      <View className="w-full h-40 bg-[#F4F8FB] relative items-center justify-center border-b border-[#EAF2F7] overflow-hidden">
        {resource.thumbnailUrl && !imageError ? (
          <Image
            source={{ uri: resource.thumbnailUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
          />
        ) : (
          <View className="items-center justify-center p-6">
            <View className="h-12 w-12 rounded-full bg-[#EAF2F7] items-center justify-center mb-1.5 border border-[#BFD6EA]">
              <Ionicons name={typeTheme.icon} size={24} color="#1F3A5F" />
            </View>
            <Text className="text-[11px] font-bold text-[#4F6B82] uppercase tracking-wider">{resource.provider}</Text>
          </View>
        )}

        {/* PROVIDER OVERLAY BADGE */}
        <View className="absolute top-2.5 left-2.5 bg-white/95 px-2.5 py-0.5 rounded-full border border-[#BFD6EA]/80 backdrop-blur-sm shadow-sm">
          <Text className="text-[9px] font-black text-[#1F3A5F] uppercase tracking-wider">{resource.provider}</Text>
        </View>

        {/* VERIFIED INDICATOR */}
        {resource.isVerified && (
          <View className="absolute top-2.5 right-2.5 bg-[#D7F1ED]/95 px-2 py-0.5 rounded-full border border-[#79D5C8] flex-row items-center shadow-sm">
            <Ionicons name="checkmark-circle" size={10} color="#1E5D53" style={{ marginRight: 2 }} />
            <Text className="text-[9px] font-extrabold uppercase tracking-widest text-[#1E5D53]">Verified</Text>
          </View>
        )}
      </View>

      {/* CARD BODY CONTENT */}
      <View className="p-4">
        {/* METADATA LINE */}
        <View className="flex-row flex-wrap items-center justify-between gap-1.5 mb-2">
          <View className="flex-row flex-wrap items-center gap-1.5 flex-1">
            <View className={`px-2.5 py-0.5 rounded-full border flex-row items-center max-w-full ${typeTheme.bg} ${typeTheme.border}`}>
              <Ionicons
                name={typeTheme.icon}
                size={10}
                color={
                  typeTheme.text.includes("red")
                    ? "#DC2626"
                    : typeTheme.text.includes("amber")
                    ? "#B45309"
                    : typeTheme.text.includes("rose")
                    ? "#BE123C"
                    : typeTheme.text.includes("emerald")
                    ? "#047857"
                    : typeTheme.text.includes("purple")
                    ? "#6D28D9"
                    : "#1F3A5F"
                }
                style={{ marginRight: 3 }}
              />
              <Text className={`text-[9px] font-bold uppercase tracking-wider ${typeTheme.text}`} style={{ flexShrink: 1 }}>{typeTheme.label}</Text>
            </View>

            {resource.estimatedTime && (
              <View className="px-2 py-0.5 rounded-full bg-[#F4F8FB] border border-[#EAF2F7] flex-row items-center">
                <Ionicons name="time-outline" size={10} color="#4F6B82" style={{ marginRight: 2 }} />
                <Text className="text-[9px] font-semibold text-[#4F6B82]">{resource.estimatedTime}</Text>
              </View>
            )}
          </View>

          {resource.relevanceTier === "TIER_1_DIRECT_GAP" || resource.isPersonalizedGap ? (
            <View className="px-2 py-0.5 rounded-full bg-[#FEF5F1] border border-[#F4A47A]">
              <Text className="text-[9px] font-extrabold uppercase tracking-wider text-[#CA5D25]">Skill Gap</Text>
            </View>
          ) : resource.relevanceTier === "TIER_2_ROLE_COMPETENCY" ? (
            <View className="px-2 py-0.5 rounded-full bg-[#EAF2F7] border border-[#BFD6EA]">
              <Text className="text-[9px] font-extrabold uppercase tracking-wider text-[#1F3A5F]">Core Role</Text>
            </View>
          ) : resource.relevanceTier === "TIER_3_SUPPORTING" ? (
            <View className="px-2 py-0.5 rounded-full bg-[#D7F1ED]/40 border border-[#79D5C8]">
              <Text className="text-[9px] font-extrabold uppercase tracking-wider text-[#1E5D53]">Supporting</Text>
            </View>
          ) : null}
        </View>

        {/* TITLE */}
        <Text className="text-base font-bold text-[#1F3A5F] mb-1.5 leading-snug">{resource.title}</Text>

        {/* DESCRIPTION */}
        <Text className="text-xs font-medium leading-4 text-[#4F6B82] mb-3" numberOfLines={3}>{resource.description}</Text>

        {/* SKILLS TAGS */}
        {resource.skills && resource.skills.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mb-3">
            {resource.skills.slice(0, 3).map((skill, sIdx) => (
              <View key={sIdx} className="bg-[#F4F8FB] border border-[#EAF2F7] px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-semibold text-[#1F3A5F]">{skill}</Text>
              </View>
            ))}
          </View>
        )}

        {/* PERSONALIZED RECOMMENDATION REASON CALLOUT */}
        {resource.recommendationReason ? (
          <View className="mb-3 p-2.5 bg-[#FEF5F1] rounded-xl border border-[#FDEEE6]">
            <View className="flex-row items-center mb-1">
              <Ionicons name="sparkles" size={12} color="#CA5D25" style={{ marginRight: 4 }} />
              <Text className="text-[9px] font-black uppercase tracking-widest text-[#CA5D25]">Why this is recommended</Text>
            </View>
            <Text className="text-xs font-medium leading-4 text-[#4F6B82]">{resource.recommendationReason}</Text>
          </View>
        ) : null}

        {/* PRIMARY ACTION BUTTON */}
        <TouchableOpacity
          onPress={handleOpenLink}
          activeOpacity={0.85}
          className="h-11 flex-row items-center justify-center rounded-xl bg-[#EAF2F7] border border-[#BFD6EA]"
        >
          <Text className="text-xs font-bold text-[#1F3A5F] mr-2">{getCtaLabel(resource.type)}</Text>
          <Ionicons name="open-outline" size={14} color="#1F3A5F" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
