export type TextSize = "small" | "medium" | "large";

export const TEXT_SIZE_SCALE: Record<TextSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1.2,
};

export function scaledFontSize(baseSize: number, textSize: TextSize): number {
  return Math.round(baseSize * TEXT_SIZE_SCALE[textSize]);
}

export function normalizeTextSize(value: unknown): TextSize {
  return value === "small" || value === "large" ? value : "medium";
}
