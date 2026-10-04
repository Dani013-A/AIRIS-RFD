import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { Text } from "./AppText";
import { CareerCompatibilityResult } from "../../services/ai/careerCompatibilityGuardrail";

interface CareerCompatibilityModalProps {
  visible: boolean;
  compatibilityResult: CareerCompatibilityResult | null;
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export const CareerCompatibilityModal: React.FC<CareerCompatibilityModalProps> = ({
  visible,
  compatibilityResult,
  onCancel,
  onConfirm,
  isProcessing = false,
}) => {
  if (!compatibilityResult) return null;

  const isDistant = compatibilityResult.classification === "DISTANT";
  const badgeColor = isDistant ? "#EF4444" : "#F59E0B";
  const badgeText = isDistant ? "Distant Academic Alignment" : "Career Transition Pivot";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.75)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ backgroundColor: "#1E293B", borderRadius: 16, width: "100%", maxWidth: 440, borderWidth: 1, borderColor: "#334155", padding: 20, overflow: "hidden" }}>
          
          {/* Header Badge */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View style={{ backgroundColor: `${badgeColor}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: badgeColor, flexDirection: "row", alignItems: "center" }}>
              <Ionicons name={isDistant ? "warning" : "git-network-outline"} size={16} color={badgeColor} style={{ marginRight: 6 }} />
              <Text style={{ color: badgeColor, fontWeight: "700", fontSize: 12 }}>{badgeText}</Text>
            </View>
          </View>

          {/* Modal Title */}
          <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
            Target Career Alignment Notice
          </Text>

          <ScrollView style={{ maxHeight: 280, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
            {/* Degree vs Target Comparison */}
            <View style={{ backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: "#334155" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>Academic Degree:</Text>
                <Text style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "600" }}>{compatibilityResult.academicProgram || "Not Specified"}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: "#334155", marginVertical: 6 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>Proposed Target:</Text>
                <Text style={{ color: "#38BDF8", fontSize: 13, fontWeight: "700" }}>{compatibilityResult.targetCareer}</Text>
              </View>
            </View>

            {/* Explanation Reason */}
            <Text style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
              {compatibilityResult.reason}
            </Text>

            {/* Missing Prerequisites */}
            {compatibilityResult.missingPrerequisites.length > 0 && (
              <View style={{ backgroundColor: "#0F172A", padding: 12, borderRadius: 10, marginBottom: 12 }}>
                <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" }}>
                  Recommended Prerequisite Knowledge
                </Text>
                {compatibilityResult.missingPrerequisites.map((req, idx) => (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <Ionicons name="ellipse-sharp" size={6} color="#F59E0B" style={{ marginRight: 8 }} />
                    <Text style={{ color: "#94A3B8", fontSize: 12 }}>{req}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Boundary Safety Notice */}
            <Text style={{ color: "#64748B", fontSize: 11, fontStyle: "italic", lineHeight: 15 }}>
              Note: AIRIS provides background alignment insights to help guide your preparation. Confirming this transition will re-target your learning dashboard and interview prep for {compatibilityResult.targetCareer}.
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={isProcessing}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#334155", alignItems: "center" }}
            >
              <Text style={{ color: "#F8FAFC", fontWeight: "600", fontSize: 14 }}>Keep Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={isProcessing}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: isDistant ? "#DC2626" : "#0284C7", alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                {isProcessing ? "Re-targeting..." : "Confirm Transition"}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};
