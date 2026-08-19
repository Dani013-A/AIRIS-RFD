import React from 'react';
import { View, ViewProps } from 'react-native';

export function InformationCard({ children, className = '', ...props }: ViewProps) {
  return (
    <View
      className={`bg-white rounded-2xl p-5 border border-[#BFD6EA] ${className}`}
      style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
      {...props}
    >
      {children}
    </View>
  );
}
