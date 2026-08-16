import { Ionicons } from "@expo/vector-icons";
import React from 'react';
import { Text, View } from 'react-native';

export interface StatusBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'info' | 'neutral';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function StatusBadge({ label, variant = 'info', icon }: StatusBadgeProps) {
  const colors = {
    success: { bg: 'bg-[#E8F8F5]', text: 'text-[#1F3A5F]', border: 'border-[#79D5C8]', icon: '#79D5C8' },
    warning: { bg: 'bg-[#FEF5F1]', text: 'text-[#CA5D25]', border: 'border-[#FDEEE6]', icon: '#CA5D25' },
    info: { bg: 'bg-[#EAF2F7]', text: 'text-[#1F3A5F]', border: 'border-[#BFD6EA]', icon: '#1F3A5F' },
    neutral: { bg: 'bg-[#F4F8FB]', text: 'text-[#4F6B82]', border: 'border-[#EAF2F7]', icon: '#4F6B82' },
  };

  const current = colors[variant];

  return (
    <View className={`flex-row items-center px-2 py-1 rounded border ${current.bg} ${current.border}`}>
      {icon && <Ionicons name={icon} size={12} color={current.icon} style={{ marginRight: 4 }} />}
      <Text className={`text-[10px] font-bold capitalize ${current.text}`}>{label}</Text>
    </View>
  );
}
