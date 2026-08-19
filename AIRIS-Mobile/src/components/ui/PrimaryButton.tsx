import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';

export interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'navy' | 'orange';
}

export function PrimaryButton({ title, loading, variant = 'navy', disabled, className = '', ...props }: PrimaryButtonProps) {
  const bgClass = disabled
    ? 'bg-[#EAF2F7]'
    : variant === 'navy'
      ? 'bg-[#1F3A5F]'
      : 'bg-[#F4A47A]';

  const textClass = disabled
    ? 'text-[#94A3B8]'
    : 'text-white';

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={`h-14 px-8 items-center justify-center rounded-full flex-row ${bgClass} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={disabled ? '#94A3B8' : '#FFFFFF'} />
      ) : (
        <Text className={`text-base font-bold ${textClass}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
