import { Platform, type TextStyle } from 'react-native';

const sans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
}) as string;

const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export const typography = {
  family: {
    sans,
    mono,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 24,
    xxl: 30,
  },
  lineHeight: {
    xs: 16,
    sm: 18,
    md: 22,
    lg: 26,
    xl: 32,
    xxl: 38,
  },
  textStyles: {
    eyebrow: {
      fontFamily: sans,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    } satisfies TextStyle,
    label: {
      fontFamily: sans,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
    } satisfies TextStyle,
    body: {
      fontFamily: sans,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '400',
    } satisfies TextStyle,
    bodyStrong: {
      fontFamily: sans,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '600',
    } satisfies TextStyle,
    title: {
      fontFamily: sans,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700',
    } satisfies TextStyle,
    hero: {
      fontFamily: sans,
      fontSize: 30,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: 0.2,
    } satisfies TextStyle,
    button: {
      fontFamily: sans,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
    } satisfies TextStyle,
    caption: {
      fontFamily: sans,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    } satisfies TextStyle,
    code: {
      fontFamily: mono,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
    } satisfies TextStyle,
  },
} as const;

export type AppTypography = typeof typography;
