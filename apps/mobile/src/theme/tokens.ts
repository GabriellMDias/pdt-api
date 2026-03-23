import { colors, resolveThemeColors, type AppThemeMode } from './colors';
import { layout, radii, spacing } from './spacing';
import { typography } from './typography';

export { colors } from './colors';
export { layout, radii, spacing } from './spacing';
export { typography } from './typography';

export const tokens = {
  colors,
  spacing,
  radii,
  layout,
  typography,
} as const;

export function buildTokens(mode: AppThemeMode) {
  return {
    colors: resolveThemeColors(mode),
    spacing,
    radii,
    layout,
    typography,
  } as const;
}

export type AppThemeTokens = ReturnType<typeof buildTokens>;
