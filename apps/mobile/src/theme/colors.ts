const brand = {
  primary: '#00553B',
  primaryHover: '#006B4A',
  primaryStrong: '#0B7A56',
  secondary: '#B54828',
} as const;

const status = {
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0284C7',
} as const;

export type AppThemeMode = 'dark' | 'light';

function withLegacyAliases<T extends {
  brand: typeof brand;
  background: {
    shell: string;
    app: string;
    surface: string;
    surfaceAlt: string;
    surfaceMuted: string;
    surfaceLight: string;
    accent: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
    focus: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    placeholder: string;
    inverse: string;
    inverseMuted: string;
    onAccent: string;
  };
  status: typeof status;
  badge: {
    neutral: { background: string; border: string; text: string };
    success: { background: string; border: string; text: string };
    info: { background: string; border: string; text: string };
    warning: { background: string; border: string; text: string };
    error: { background: string; border: string; text: string };
    accent: { background: string; border: string; text: string };
  };
  overlay: {
    soft: string;
    strong: string;
  };
}>(palette: T) {
  return {
    ...palette,
    pilarGreen: brand.primary,
    pilarOrange: brand.secondary,
    bgDark: palette.background.app,
    bgDarkAlt: palette.background.surfaceAlt,
    bgDarkShell: palette.background.shell,
    bgLight: palette.background.surfaceLight,
    surfaceLight: palette.background.surfaceLight,
    borderLight: palette.border.default,
    textLight: palette.text.inverse,
    textMutedLight: palette.text.inverseMuted,
    textDark: palette.text.primary,
    textMutedDark: palette.text.secondary,
    success: status.success,
    warning: status.warning,
    error: status.error,
    info: status.info,
  } as const;
}

export const darkColors = withLegacyAliases({
  brand,
  background: {
    shell: '#1F1F1C',
    app: '#282825',
    surface: '#282825',
    surfaceAlt: '#33332F',
    surfaceMuted: '#22221F',
    surfaceLight: '#E3E3E3',
    accent: brand.primary,
  },
  border: {
    subtle: 'rgba(255,255,255,0.10)',
    default: 'rgba(255,255,255,0.14)',
    strong: 'rgba(255,255,255,0.24)',
    focus: 'rgba(0,85,59,0.55)',
  },
  text: {
    primary: '#F5F5F5',
    secondary: '#D4D4D4',
    muted: 'rgba(245,245,245,0.72)',
    placeholder: 'rgba(255,255,255,0.45)',
    inverse: '#111827',
    inverseMuted: '#6B7280',
    onAccent: '#FFFFFF',
  },
  status,
  badge: {
    neutral: {
      background: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.14)',
      text: '#F5F5F5',
    },
    success: {
      background: 'rgba(22,163,74,0.18)',
      border: 'rgba(22,163,74,0.42)',
      text: '#DCFCE7',
    },
    info: {
      background: 'rgba(2,132,199,0.18)',
      border: 'rgba(2,132,199,0.42)',
      text: '#DBEAFE',
    },
    warning: {
      background: 'rgba(217,119,6,0.18)',
      border: 'rgba(217,119,6,0.42)',
      text: '#FED7AA',
    },
    error: {
      background: 'rgba(220,38,38,0.18)',
      border: 'rgba(220,38,38,0.42)',
      text: '#FECACA',
    },
    accent: {
      background: 'rgba(255,255,255,0.18)',
      border: 'rgba(255,255,255,0.24)',
      text: '#FFFFFF',
    },
  },
  overlay: {
    soft: 'rgba(0,0,0,0.24)',
    strong: 'rgba(0,0,0,0.38)',
  },
});

export const lightColors = withLegacyAliases({
  brand,
  background: {
    shell: '#E9EFEC',
    app: '#F4F7F5',
    surface: '#FFFFFF',
    surfaceAlt: '#F7FAF8',
    surfaceMuted: '#EEF3F0',
    surfaceLight: '#FFFFFF',
    accent: brand.primary,
  },
  border: {
    subtle: 'rgba(17,24,39,0.08)',
    default: 'rgba(17,24,39,0.14)',
    strong: 'rgba(17,24,39,0.24)',
    focus: 'rgba(0,85,59,0.32)',
  },
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: 'rgba(17,24,39,0.66)',
    placeholder: 'rgba(17,24,39,0.42)',
    inverse: '#FFFFFF',
    inverseMuted: '#E5E7EB',
    onAccent: '#FFFFFF',
  },
  status,
  badge: {
    neutral: {
      background: 'rgba(17,24,39,0.05)',
      border: 'rgba(17,24,39,0.10)',
      text: '#111827',
    },
    success: {
      background: '#DCFCE7',
      border: '#86EFAC',
      text: '#166534',
    },
    info: {
      background: '#DBEAFE',
      border: '#93C5FD',
      text: '#1D4ED8',
    },
    warning: {
      background: '#FEF3C7',
      border: '#FCD34D',
      text: '#92400E',
    },
    error: {
      background: '#FEE2E2',
      border: '#FCA5A5',
      text: '#B91C1C',
    },
    accent: {
      background: 'rgba(0,85,59,0.14)',
      border: 'rgba(0,85,59,0.24)',
      text: '#00553B',
    },
  },
  overlay: {
    soft: 'rgba(17,24,39,0.18)',
    strong: 'rgba(17,24,39,0.36)',
  },
});

export const colors = darkColors;

export function resolveThemeColors(mode: AppThemeMode) {
  return mode === 'light' ? lightColors : darkColors;
}

export type AppColors = typeof darkColors;
