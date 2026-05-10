/**
 * Paleta de cores - Alias para o tema principal
 */

import { Colors } from './theme';

// Exportar cores do tema
export const PRIMARY = Colors.primary;
export const PRIMARY_LIGHT = Colors.primaryLight;
export const PRIMARY_DARK = Colors.primaryDark;

export const SECONDARY = Colors.secondary;
export const SECONDARY_LIGHT = Colors.secondaryLight;
export const SECONDARY_DARK = Colors.secondaryDark;

export const SUCCESS = Colors.success;
export const WARNING = Colors.warning;
export const DANGER = Colors.danger;
export const INFO = Colors.info;

export const DARK = Colors.gray800;
export const DARK_LIGHT = Colors.gray700;
export const GRAY = Colors.gray500;
export const GRAY_LIGHT = Colors.gray300;
export const LIGHT = Colors.gray100;
export const WHITE = Colors.white;

export const BACKGROUND = Colors.background;
export const BACKGROUND_DARK = Colors.gray900;

export const GRADIENT_PAGAR = Colors.gradientPagar;
export const GRADIENT_RECEBER = Colors.gradientReceber;
export const GRADIENT_ACCENT = Colors.gradientAccent;

export const MONTH_COLORS = {
  current: PRIMARY,
  future: SECONDARY_LIGHT,
  past: GRAY_LIGHT,
  paid: SUCCESS,
  pending: WARNING,
  overdue: DANGER,
};

export const UI = {
  primary: PRIMARY,
  secondary: SECONDARY,
  success: SUCCESS,
  warning: WARNING,
  danger: DANGER,
  info: INFO,
  accent: Colors.accent,
  background: Colors.background,
  surface: Colors.surface,
  surfaceAlt: Colors.surfaceAlt,
  border: Colors.border,
  text: Colors.gray900,
  textSecondary: Colors.gray600,
  textLight: Colors.gray400,
  white: WHITE,
  shadow: Colors.shadow,
  shadowDark: 'rgba(15, 23, 42, 0.18)',
};

