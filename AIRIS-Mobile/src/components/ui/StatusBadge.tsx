import { Ionicons } from "@expo/vector-icons";
import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';

export interface StatusBadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'info' | 'neutral';
  icon?: keyof typeof Ionicons.glyphMap;
}

export function StatusBadge({ label, variant = 'info', icon }: StatusBadgeProps) {
  const colors = {
    success: { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]', border: 'border-[#22C55E]', icon: '#22C55E' },
    warning: { bg: 'bg-[#FEF9C3]', text: 'text-[#854D0E]', border: 'border-[#FACC15]', icon: '#EAB308' },
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
