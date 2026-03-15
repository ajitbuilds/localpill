/**
 * LocalPill Customer App — Premium Light Theme
 * Royal Indigo palette — bold, modern, tech-forward.
 */

import { Platform } from 'react-native';

// ── Core Palette ──────────────────────────────────────────────────────────
const primary = '#6366F1'; // Indigo 500 — bold, premium
const primaryDark = '#4F46E5'; // Indigo 600 — pressed / shadow
const primaryLight = '#E0E7FF'; // Indigo 100 — badges, soft bg
const primarySurface = '#EEF2FF'; // Indigo 50  — tinted card bg

const success = '#059669'; // Emerald 600
const warning = '#F59E0B'; // Amber 500
const danger = '#DC2626'; // Red 600

const surface = '#FFFFFF';
const background = '#F8FAFC'; // Slate 50
const text = '#0F172A'; // Slate 900
const textMuted = '#64748B'; // Slate 500
const border = '#E2E8F0'; // Slate 200

// ── Gradient Presets ──────────────────────────────────────────────────────
// Reusable gradient tuples for LinearGradient components.
export const Gradients = {
  hero: ['#6366F1', '#4338CA'] as [string, string],       // deep indigo hero
  heroDark: ['#4F46E5', '#312E81'] as [string, string],   // darker variant
  primary: ['#6366F1', '#818CF8'] as [string, string],    // soft indigo CTA
  primaryDark: ['#4F46E5', '#6366F1'] as [string, string],
  surface: ['#EEF2FF', '#E0E7FF'] as [string, string],   // subtle card tint
  surfaceDark: ['#1E1B4B', '#312E81'] as [string, string],
} as const;

export const Colors = {
  light: {
    text,
    textMuted,
    background,
    surface,
    surfaceElevated: '#FFFFFF',  // brighter than surface for emphasis cards
    tint: primary,
    tintDark: primaryDark,
    tintLight: primaryLight,
    tintSurface: primarySurface,
    accent: primary,
    accentSoft: primaryLight,
    overlay: 'rgba(15, 23, 42, 0.4)',
    icon: textMuted,
    tabIconDefault: '#94A3B8',
    tabIconSelected: primary,
    success,
    successSoft: '#ECFDF5',
    warning,
    warningSoft: '#FFFBEB',
    danger,
    dangerSoft: '#FEF2F2',
    border,
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
    info: '#3B82F6',
    infoSoft: '#EFF6FF',
    surfaceHover: '#F1F5F9',
  },
  // True Dark Mode Palette
  dark: {
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#273549',  // slightly brighter than surface
    tint: primary,
    tintDark: primaryLight,
    tintLight: '#312E81',
    tintSurface: '#1E1B4B',
    accent: primary,
    accentSoft: '#312E81',
    overlay: 'rgba(0, 0, 0, 0.7)',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: primary,
    success: '#10B981',
    successSoft: '#064E3B',
    warning: '#FBBF24',
    warningSoft: '#78350F',
    danger: '#EF4444',
    dangerSoft: '#7F1D1D',
    border: '#334155',
    shadow: '#000000',
    white: '#FFFFFF',
    black: '#000000',
    info: '#60A5FA',
    infoSoft: '#1E3A5F',
    surfaceHover: '#273549',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ── Typography Scale ─────────────────────────────────────────────────────
// 5 semantic levels. Never use raw fontWeight in inline styles.
export const Typography = {
  display: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  heading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 22,
  },
  bodyLarge: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 21,
  },
  caption: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 18,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 14,
  },
  overline: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
} as const;

// ── Spacing ──────────────────────────────────────────────────────────────
// Consistent spatial rhythm across all screens.
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

// ── Shadows ──────────────────────────────────────────────────────────────
// 3 levels only. Avoids Android elevation artifacts.
export const Shadows = {
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// ── Border Radius ────────────────────────────────────────────────────────
// 4 standard values. No more ad-hoc numbers.
export const Radius = {
  sm: 8,     // chips, badges, small pills
  md: 14,    // buttons, inputs, icon circles
  lg: 20,    // section cards, modals, main cards
  full: 9999, // avatar circles, circular elements
} as const;

// ── Animation Tokens ─────────────────────────────────────────────────────
export const Motion = {
  fast: 150,     // micro-interactions
  normal: 300,   // transitions
  slow: 500,     // page transitions
  spring: { friction: 6, tension: 120 },
} as const;

// ── Z-Index Scale ────────────────────────────────────────────────────────
export const ZIndex = {
  base: 0,
  card: 1,
  sticky: 10,
  modal: 100,
  toast: 1000,
} as const;

// ── Opacity Scale (hex alpha suffixes) ───────────────────────────────────
export const Opacity = {
  '05': '0D',
  '10': '1A',
  '15': '26',
  '20': '33',
  '30': '4D',
  '50': '80',
} as const;
