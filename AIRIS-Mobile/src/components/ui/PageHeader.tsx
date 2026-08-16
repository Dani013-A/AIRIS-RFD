import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  rightElement?: React.ReactNode;
}

export function PageHeader({ title, subtitle, showBackButton = true, rightElement }: PageHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between mb-8 px-6 pt-6 pb-2">
      <View className="flex-row items-center flex-1">
        {showBackButton && (
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 items-center justify-center rounded-full bg-white border border-[#BFD6EA] mr-4 shadow-sm"
            style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}
          >
            <Ionicons name="arrow-back" size={20} color="#1F3A5F" />
          </TouchableOpacity>
        )}
        <View className="flex-1 pr-4">
          <Text className="text-2xl font-extrabold text-[#1F3A5F]" numberOfLines={1}>{title}</Text>
          {subtitle && (
            <Text className="text-sm font-semibold text-[#4F6B82] mt-1">{subtitle}</Text>
          )}
        </View>
      </View>
      {rightElement && (
        <View>{rightElement}</View>
      )}
    </View>
  );
}
