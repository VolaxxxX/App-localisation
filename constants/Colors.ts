/**
 * Centralised colour palette. Two themes (light / dark) share the same keys so
 * components can pull a single `colors` object from `useColors()` without caring
 * about the active scheme.
 */

export interface ColorScheme {
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryDark: string;
  primaryText: string;
  success: string;
  warning: string;
  danger: string;
  online: string;
  offline: string;
  overlay: string;
  shadow: string;
}

export const LightColors: ColorScheme = {
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF1F8',
  card: '#FFFFFF',
  border: '#E3E8F0',
  text: '#0B1221',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryText: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  online: '#16A34A',
  offline: '#9CA3AF',
  overlay: 'rgba(11, 18, 33, 0.45)',
  shadow: '#0B1221',
};

export const DarkColors: ColorScheme = {
  background: '#0B1221',
  surface: '#121A2B',
  surfaceAlt: '#1B2538',
  card: '#15203A',
  border: '#243047',
  text: '#F4F6FB',
  textMuted: '#9AA6BC',
  textInverse: '#0B1221',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryText: '#FFFFFF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  online: '#22C55E',
  offline: '#6B7280',
  overlay: 'rgba(0, 0, 0, 0.55)',
  shadow: '#000000',
};

/** Preset marker colours users can choose from. */
export const MARKER_COLORS = [
  '#2563EB', // blue
  '#DC2626', // red
  '#16A34A', // green
  '#D97706', // amber
  '#7C3AED', // violet
  '#DB2777', // pink
  '#0891B2', // cyan
  '#65A30D', // lime
] as const;

/** Preset avatar emojis. */
export const AVATAR_EMOJIS = [
  '🙂', '😎', '🦊', '🐱', '🐻', '🐼', '🐧', '🦁',
  '🐰', '🐸', '🦄', '🐢', '🌟', '🚀', '⚡', '🌈',
] as const;
