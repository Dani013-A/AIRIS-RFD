import React from "react";
import { View } from "react-native";
import { Text } from "./AppText";
import { Ionicons } from "@expo/vector-icons";
import { PASSWORD_REQUIREMENTS } from "../../utils/passwordPolicy";

interface PasswordRequirementsViewProps {
  password: string;
}

export const PasswordRequirementsView: React.FC<PasswordRequirementsViewProps> = ({ password }) => {
  return (
    <View className="bg-[#F4F8FB] border border-[#BFD6EA] rounded-xl p-3.5 mt-1 mb-2">
      <Text className="text-[10px] font-bold text-[#4F6B82] uppercase tracking-wider mb-2">
        Password Security Requirements
      </Text>
      <View className="gap-1.5">
        {PASSWORD_REQUIREMENTS.map((rule) => {
          const isMet = rule.test(password);
          return (
            <View key={rule.id} className="flex-row items-center">
              <Ionicons
                name={isMet ? "checkmark-circle" : "ellipse-outline"}
                size={14}
                color={isMet ? "#1E5D53" : "#8B95A5"}
                style={{ marginRight: 6 }}
              />
              <Text className={`text-xs font-medium ${isMet ? "text-[#1E5D53] font-bold" : "text-[#8B95A5]"}`}>
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};
