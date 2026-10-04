import React from "react";
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from "react-native";
import { useAppearanceStore } from "../../store/appearanceStore";
import { scaledFontSize, TEXT_SIZE_SCALE, type TextSize } from "./typographyScale";

const CLASS_SIZES: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
};

function typographyStyle(className: string | undefined, style: React.ComponentProps<typeof NativeText>["style"], textSize: TextSize) {
  const inlineStyle = StyleSheet.flatten(style);
  const classSize = [...(className?.matchAll(/(?:^|\s)text-(\[(\d+)px\]|xs|sm|base|lg|xl|2xl|3xl|4xl)(?=\s|$)/g) || [])].at(-1);
  const baseSize = inlineStyle?.fontSize || (classSize?.[2] ? Number(classSize[2]) : CLASS_SIZES[classSize?.[1] || ""] || 14);
  const fontSize = scaledFontSize(baseSize, textSize);
  const leading = className?.match(/(?:^|\s)leading-(\d+)(?=\s|$)/)?.[1];
  const baseLineHeight = inlineStyle?.lineHeight || (leading ? Number(leading) * 4 : undefined);
  const lineHeight = baseLineHeight && textSize !== "medium"
    ? Math.max(Math.round(baseLineHeight * TEXT_SIZE_SCALE[textSize]), Math.round(fontSize * 1.25))
    : undefined;
  return { fontSize, ...(lineHeight ? { lineHeight } : {}) };
}

type AppTextProps = React.ComponentProps<typeof NativeText> & { className?: string };

export function Text({ className, style, ...props }: AppTextProps) {
  const textSize = useAppearanceStore((state) => state.textSize);
  return <NativeText {...props} className={className} style={[style, typographyStyle(className, style, textSize)]} />;
}

type AppTextInputProps = React.ComponentProps<typeof NativeTextInput> & { className?: string };

export function TextInput({ className, style, ...props }: AppTextInputProps) {
  const textSize = useAppearanceStore((state) => state.textSize);
  return <NativeTextInput {...props} className={className} style={[style, typographyStyle(className, style, textSize)]} />;
}
