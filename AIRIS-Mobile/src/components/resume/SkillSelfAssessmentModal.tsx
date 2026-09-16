import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { SelfRating, SkillSelfAssessmentMap } from "../../services/resume/selfAssessmentService";
import { formatCanonicalCompetencyName } from "../../services/resume/selfAssessmentService";

export interface SkillAssessmentTarget {
  name: string;
  relevance: "HIGH" | "MEDIUM" | "LOW";
}

interface SkillSelfAssessmentModalProps {
  visible: boolean;
  skills: SkillAssessmentTarget[];
  initialRatings?: SkillSelfAssessmentMap;
  onSave: (ratings: SkillSelfAssessmentMap) => void;
  onSkip: () => void;
}

export default function SkillSelfAssessmentModal({
  visible,
  skills,
  initialRatings = {},
  onSave,
  onSkip,
}: SkillSelfAssessmentModalProps) {
  const [ratings, setRatings] = useState<SkillSelfAssessmentMap>({});

  // Defensive deduplication guard before rendering: ONE CANONICAL COMPETENCY = ONE RATING ITEM
  const uniqueSkills = React.useMemo(() => {
    const map = new Map<string, SkillAssessmentTarget>();
    for (const skill of skills || []) {
      const canonicalName = formatCanonicalCompetencyName(skill.name);
      const canonicalKey = canonicalName.toLowerCase();
      if (!canonicalKey) continue;
      if (!map.has(canonicalKey)) {
        map.set(canonicalKey, {
          name: canonicalName,
          relevance: skill.relevance,
        });
      } else {
        const existing = map.get(canonicalKey)!;
        const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (rank[skill.relevance] > rank[existing.relevance]) {
          existing.relevance = skill.relevance;
        }
      }
    }
    return Array.from(map.values());
  }, [skills]);

  useEffect(() => {
    if (visible) {
      // Pre-fill with initial stored ratings, reconciling canonical and alias keys
      const prefill: SkillSelfAssessmentMap = {};
      uniqueSkills.forEach((s) => {
        const canonicalKey = s.name.toLowerCase();
        if (initialRatings[canonicalKey]) {
          prefill[canonicalKey] = initialRatings[canonicalKey];
        } else {
          // Fallback check: reconcile any alias key in initialRatings
          for (const [key, rating] of Object.entries(initialRatings)) {
            if (formatCanonicalCompetencyName(key).toLowerCase() === canonicalKey) {
              prefill[canonicalKey] = rating;
              break;
            }
          }
        }
      });
      setRatings(prefill);
    }
  }, [visible, uniqueSkills, initialRatings]);

  const handleSelect = (skillName: string, rating: SelfRating) => {
    const k = formatCanonicalCompetencyName(skillName).toLowerCase();
    setRatings((prev) => ({
      ...prev,
      [k]: prev[k] === rating ? "SKIP" : rating,
    }));
  };

  const handleContinue = () => {
    onSave(ratings);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl max-h-[85%] p-6 shadow-xl border-t border-[#BFD6EA]">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center gap-2 mb-1">
                <View className="h-7 w-7 rounded-full bg-[#EAF2F7] items-center justify-center">
                  <Ionicons name="sparkles" size={16} color="#CA5D25" />
                </View>
                <Text className="text-xl font-extrabold text-[#1F3A5F]">How confident are you with these skills?</Text>
              </View>
              <Text className="text-xs text-[#4F6B82] leading-4">
                Your answers help AIRIS personalize your guidance. They won't change your ATS score.
              </Text>
            </View>
            <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#8B95A5" />
            </TouchableOpacity>
          </View>

          <View className="h-[1px] bg-[#EAF2F7] my-3" />

          {/* Skill List */}
          <ScrollView className="max-h-[380px] my-2" showsVerticalScrollIndicator={false}>
            <View className="gap-4 pr-1">
              {uniqueSkills.map((skill) => {
                const displayName = skill.name;
                const k = displayName.toLowerCase();
                const currentRating = ratings[k] || "SKIP";

                return (
                  <View key={k} className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                    <View className="flex-row justify-between items-center mb-2.5">
                      <Text className="text-sm font-bold text-[#1F3A5F] flex-1 mr-2">{displayName}</Text>
                      <View
                        className={`px-2.5 py-0.5 rounded-full ${
                          skill.relevance === "HIGH"
                            ? "bg-[#FFF3ED]"
                            : skill.relevance === "MEDIUM"
                            ? "bg-[#EAF2F7]"
                            : "bg-[#F1F5F9]"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            skill.relevance === "HIGH"
                              ? "text-[#CA5D25]"
                              : skill.relevance === "MEDIUM"
                              ? "text-[#1F3A5F]"
                              : "text-[#64748B]"
                          }`}
                        >
                          {skill.relevance === "HIGH"
                            ? "High Priority"
                            : skill.relevance === "MEDIUM"
                            ? "Medium Priority"
                            : "Secondary"}
                        </Text>
                      </View>
                    </View>

                    {/* Rating Selector Buttons */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => handleSelect(skill.name, "STRONG")}
                        className={`flex-1 py-2.5 rounded-xl border items-center justify-center flex-row ${
                          currentRating === "STRONG"
                            ? "bg-[#1E5D53] border-[#1E5D53]"
                            : "bg-white border-[#CBD5E1]"
                        }`}
                      >
                        <Ionicons
                          name="ribbon-outline"
                          size={14}
                          color={currentRating === "STRONG" ? "#FFFFFF" : "#1E5D53"}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          className={`text-xs font-bold ${
                            currentRating === "STRONG" ? "text-white" : "text-[#1E5D53]"
                          }`}
                        >
                          Strong
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSelect(skill.name, "MODERATE")}
                        className={`flex-1 py-2.5 rounded-xl border items-center justify-center flex-row ${
                          currentRating === "MODERATE"
                            ? "bg-[#CA5D25] border-[#CA5D25]"
                            : "bg-white border-[#CBD5E1]"
                        }`}
                      >
                        <Ionicons
                          name="stats-chart-outline"
                          size={14}
                          color={currentRating === "MODERATE" ? "#FFFFFF" : "#CA5D25"}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          className={`text-xs font-bold ${
                            currentRating === "MODERATE" ? "text-white" : "text-[#CA5D25]"
                          }`}
                        >
                          Moderate
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSelect(skill.name, "WEAK")}
                        className={`flex-1 py-2.5 rounded-xl border items-center justify-center flex-row ${
                          currentRating === "WEAK"
                            ? "bg-[#64748B] border-[#64748B]"
                            : "bg-white border-[#CBD5E1]"
                        }`}
                      >
                        <Ionicons
                          name="book-outline"
                          size={14}
                          color={currentRating === "WEAK" ? "#FFFFFF" : "#64748B"}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          className={`text-xs font-bold ${
                            currentRating === "WEAK" ? "text-white" : "text-[#64748B]"
                          }`}
                        >
                          Weak
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View className="h-[1px] bg-[#EAF2F7] my-3" />

          {/* Footer Actions */}
          <View className="flex-row items-center justify-between gap-3 pt-1">
            <TouchableOpacity
              onPress={onSkip}
              className="py-3 px-5 rounded-full border border-[#CBD5E1] items-center justify-center"
            >
              <Text className="text-xs font-bold text-[#64748B]">Skip for now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleContinue}
              className="flex-1 py-3 px-6 rounded-full bg-[#CA5D25] items-center justify-center flex-row shadow-sm"
            >
              <Text className="text-sm font-bold text-white mr-1.5">Save & Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
