import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

export interface SecondaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export function SecondaryButton({ title, loading, disabled, className = '', ...props }: SecondaryButtonProps) {
  const borderClass = disabled ? 'border-[#EAF2F7]' : 'border-[#BFD6EA]';
  const bgClass = disabled ? 'bg-[#F4F8FB]' : 'bg-white';
  const textClass = disabled ? 'text-[#94A3B8]' : 'text-[#1F3A5F]';

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={`h-14 px-8 items-center justify-center rounded-full flex-row border-2 ${bgClass} ${borderClass} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={disabled ? '#94A3B8' : '#1F3A5F'} />
      ) : (
        <Text className={`text-base font-bold ${textClass}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
