export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const layout = {
  screenPaddingHorizontal: 20,
  screenPaddingVertical: 24,
  screenContentMaxWidth: 560,
  inputMinHeight: 52,
  buttonHeights: {
    sm: 40,
    md: 48,
    lg: 52,
  },
} as const;

export type AppSpacing = typeof spacing;
