/**
 * Fluxo — tema visual (React Native + TypeScript)
 * Identidade: neutros refinados + índigo (ação), Entradas (azul céu), Saídas (rose).
 */

import { Platform } from 'react-native';

export const Colors = {
  /** Ação principal — índigo (sem verde dominante) */
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#4338CA',

  accent: '#6366F1',
  accentDark: '#4F46E5',
  accentMuted: 'rgba(79, 70, 229, 0.09)',

  secondary: '#64748B',
  secondaryLight: '#94A3B8',
  secondaryDark: '#475569',

  warm: '#EA580C',
  warmLight: '#FB923C',

  /** Estados semânticos — pouca saturação */
  success: '#4F46E5',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#0369A1',

  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F4F4F5',
  gray200: '#E4E4E7',
  gray300: '#D4D4D8',
  gray400: '#A1A1AA',
  gray500: '#71717A',
  gray600: '#52525B',
  gray700: '#3F3F46',
  gray800: '#27272A',
  gray900: '#18181B',
  black: '#09090B',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  shadow: '#0F172A',

  headerBackground: '#0F172A',
  headerSubtitle: 'rgba(248, 250, 252, 0.72)',

  gradientPrimary: ['#4F46E5', '#6366F1'] as const,
  gradientHero: ['#0F172A', '#1E293B', '#334155'] as const,
  gradientSecondary: ['#64748B', '#94A3B8'] as const,
  gradientPagar: ['#BE123C', '#FB7185'] as const,
  gradientReceber: ['#0369A1', '#38BDF8'] as const,
  gradientAccent: ['#4F46E5', '#7C3AED'] as const,
};

/**
 * RECEBER / PAGAR = chaves internas (DB). Labels na UI: Entradas / Saídas.
 */
export const FlowTokens = {
  RECEBER: {
    label: 'Entradas',
    accent: '#0369A1',
    mutedBg: '#F0F9FF',
    border: '#BAE6FD',
    text: '#0C4A6E',
    stripe: '#0284C7',
  },
  PAGAR: {
    label: 'Saídas',
    accent: '#BE123C',
    mutedBg: '#FFF1F2',
    border: '#FECDD3',
    text: '#881337',
    stripe: '#F43F5E',
  },
} as const;

export const StatusTokens = {
  PAGO: {
    label: 'Quitado',
    bg: '#EEF2FF',
    text: '#3730A3',
    border: '#C7D2FE',
  },
  PENDENTE: {
    label: 'Pendente',
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
  },
  VENCIDO: {
    label: 'Atrasado',
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
  },
} as const;

export const Typography = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',

  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeight: {
    tight: 20,
    normal: 24,
    relaxed: 30,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const BorderRadius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
};

export const Animations = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
};

export const Theme = {
  colors: Colors,
  flow: FlowTokens,
  status: StatusTokens,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  animations: Animations,
};

export type ThemeType = typeof Theme;
export type ColorType = keyof typeof Colors;
