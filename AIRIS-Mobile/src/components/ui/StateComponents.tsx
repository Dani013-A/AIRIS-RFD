import { Ionicons } from "@expo/vector-icons";
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from './AppText';

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <ActivityIndicator size="large" color="#F4A47A" />
      <Text className="mt-4 text-sm font-semibold text-[#4F6B82] text-center">{message}</Text>
    </View>
  );
}

export function EmptyState({ title = "Nothing here yet", message, icon = "document-text-outline" }: { title?: string, message?: string, icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View className="items-center justify-center p-8 bg-transparent rounded-2xl border border-dashed border-[#BFD6EA] my-4">
      <View className="w-16 h-16 rounded-full bg-[#EAF2F7] items-center justify-center mb-4">
        <Ionicons name={icon} size={32} color="#BFD6EA" />
      </View>
      <Text className="text-lg font-bold text-[#1F3A5F] text-center mb-2">{title}</Text>
      {message && <Text className="text-sm text-[#4F6B82] text-center">{message}</Text>}
    </View>
  );
}

export function ErrorState({ title = "Something went wrong", message = "We couldn't load this section. Please try again." }: { title?: string, message?: string }) {
  return (
    <View className="items-center justify-center p-8 bg-[#FEF5F1] rounded-2xl border border-[#FDEEE6] my-4">
      <Ionicons name="warning-outline" size={40} color="#CA5D25" className="mb-4" />
      <Text className="text-lg font-bold text-[#CA5D25] text-center mb-2 mt-4">{title}</Text>
      <Text className="text-sm text-[#CA5D25] text-center opacity-80">{message}</Text>
    </View>
  );
}
