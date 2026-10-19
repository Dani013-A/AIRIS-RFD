/**
 * AIRIS shared design tokens.
 *
 * Single owner for brand color, spacing, radii, shadow, and typography roles.
 * Screens should reference these values instead of inventing one-off hex/spacing.
 */

export const AirisColors = {
  background: "#F4F8FB",
  surface: "#FFFFFF",
  surfaceMuted: "#EAF2F7",
  border: "#BFD6EA",
  divider: "#EAF2F7",
  ink: "#1F3A5F",
  body: "#4F6B82",
  muted: "#8B95A5",
  brand: "#F4A47A",
  brandStrong: "#CA5D25",
  brandSoft: "#FEF5F1",
  teal: "#79D5C8",
  tealDeep: "#1E5D53",
  tealSoft: "#F1FAF8",
  tealBorder: "#D7F1ED",
  successBg: "#DCFCE7",
  successText: "#166534",
  successBorder: "#22C55E",
  warningBg: "#FEF9C3",
  warningText: "#854D0E",
  warningBorder: "#FACC15",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  errorBorder: "#FCA5A5",
  disabledBg: "#EAF2F7",
  disabledText: "#94A3B8",
} as const;

export const AirisSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 24,
  cardPadding: 20,
  sectionGap: 24,
  fieldGap: 8,
} as const;

export const AirisRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const AirisShadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  raised: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
} as const;

/** Logical base font sizes (before Small/Medium/Large scaling). */
export const AirisType = {
  screenTitle: 28,
  sectionHeading: 20,
  cardHeading: 16,
  body: 15,
  secondaryBody: 13,
  label: 12,
  button: 15,
  majorScore: 36,
  scoreBreakdown: 20,
  caption: 11,
} as const;
