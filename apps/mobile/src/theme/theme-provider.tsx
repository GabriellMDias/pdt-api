import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import {
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useAuthStore } from '@/src/features/auth/store/use-auth-store';
import { resolveThemeColors, type AppColors, type AppThemeMode } from './colors';
import { layout, radii, spacing } from './spacing';
import { typography } from './typography';

export type AppTheme = {
  mode: AppThemeMode;
  isDark: boolean;
  colors: AppColors;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
  typography: typeof typography;
};

const defaultTheme: AppTheme = {
  mode: 'dark',
  isDark: true,
  colors: resolveThemeColors('dark'),
  spacing,
  radii,
  layout,
  typography,
};

const AppThemeContext = createContext<AppTheme>(defaultTheme);

function createTheme(mode: AppThemeMode): AppTheme {
  return {
    mode,
    isDark: mode === 'dark',
    colors: resolveThemeColors(mode),
    spacing,
    radii,
    layout,
    typography,
  };
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const mode = useAuthStore((state) => state.appTheme);
  const value = useMemo(() => createTheme(mode), [mode]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}

type ThemeStyleMap = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function useThemedStyles<T extends ThemeStyleMap>(
  factory: (theme: AppTheme) => T,
): T {
  const theme = useAppTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
