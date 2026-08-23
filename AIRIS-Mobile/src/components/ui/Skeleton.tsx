import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export function SkeletonBlock({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className = "",
  style,
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: "#DCE7F0",
          opacity,
        },
        style,
      ]}
      className={className}
    />
  );
}

export function SkeletonScoreCard() {
  return (
    <View className="rounded-3xl bg-white p-6 border border-[#BFD6EA] shadow-sm mb-4">
      <View className="items-center mb-4">
        <SkeletonBlock width={120} height={14} borderRadius={6} className="mb-3" />
        <SkeletonBlock width={100} height={70} borderRadius={16} className="mb-3" />
        <SkeletonBlock width={140} height={28} borderRadius={14} />
      </View>
      <View className="flex-row gap-3 mt-4">
        <View className="flex-1 bg-[#F4F8FB] p-4 rounded-2xl border border-[#BFD6EA]">
          <SkeletonBlock width={80} height={12} className="mb-2" />
          <SkeletonBlock width={50} height={28} borderRadius={6} />
        </View>
        <View className="flex-1 bg-[#F4F8FB] p-4 rounded-2xl border border-[#BFD6EA]">
          <SkeletonBlock width={80} height={12} className="mb-2" />
          <SkeletonBlock width={50} height={28} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonResourceCard() {
  return (
    <View className="rounded-2xl bg-white p-5 border border-[#BFD6EA] shadow-sm mb-3">
      <View className="flex-row items-center justify-between mb-3">
        <SkeletonBlock width={90} height={22} borderRadius={11} />
        <SkeletonBlock width={70} height={16} borderRadius={4} />
      </View>
      <SkeletonBlock width="85%" height={18} borderRadius={6} className="mb-2" />
      <SkeletonBlock width="60%" height={14} borderRadius={4} className="mb-4" />
      <View className="flex-row items-center justify-between pt-2 border-t border-[#EAF2F7]">
        <SkeletonBlock width={80} height={14} borderRadius={4} />
        <SkeletonBlock width={100} height={32} borderRadius={16} />
      </View>
    </View>
  );
}
