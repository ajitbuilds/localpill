/**
 * LocalPill Pharmacy App — Premium Design System
 * Inspired by Swiggy/Dunzo partner apps with healthcare aesthetics
 */

import { Platform } from 'react-native';

// ─── Brand Colors ───────────────────────────────────────────
const sapphire = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
  950: '#0F172A',
};

const gray = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
  950: '#030712',
};

const amber = {
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
};

const red = {
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
};

const blue = {
  400: '#60A5FA',
  500: '#3B82F6',
};

// ─── Theme Colors ───────────────────────────────────────────
export const Colors = {
  light: {
    // Core
    primary: sapphire[600],
    primaryLight: sapphire[50],
    primaryGlow: 'rgba(59, 130, 246, 0.12)',

    // Surfaces
    background: '#EFF6FF',    // Blue-tinted background
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    // Text
    text: gray[900],
    textSecondary: gray[500],
    textMuted: gray[400],
    textOnPrimary: '#FFFFFF',

    // Borders
    border: gray[200],
    borderLight: gray[100],

    // Status colors
    success: sapphire[500],
    warning: amber[500],
    danger: red[500],
    info: blue[500],

    // Component-specific
    tint: sapphire[600],
    icon: gray[500],
    tabIconDefault: gray[400],
    tabIconSelected: sapphire[600],
    tabBarBackground: '#FFFFFF',

    // Gradient sets
    heroGradient: [sapphire[900], sapphire[600]] as [string, string],
    buttonGradient: [sapphire[600], sapphire[500]] as [string, string],
    splashGradient: [sapphire[950], sapphire[800]] as [string, string],

    // Input
    inputBackground: '#FFFFFF',
    inputBorder: gray[200],
    inputFocusBorder: sapphire[500],
    placeholder: gray[400],

    // Cards
    cardShadow: 'rgba(0, 0, 0, 0.06)',
    cardShadowElevated: 'rgba(0, 0, 0, 0.1)',

    // Status badges
    onlineDot: sapphire[500],
    offlineDot: red[500],

    // Chat
    myBubble: sapphire[600],
    myBubbleText: '#FFFFFF',
    theirBubble: gray[100],
    theirBubbleText: gray[900],
  },
  dark: {
    // Core
    primary: sapphire[500],
    primaryLight: 'rgba(59, 130, 246, 0.15)',
    primaryGlow: 'rgba(59, 130, 246, 0.2)',

    // Surfaces
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#334155',

    // Text
    text: gray[50],
    textSecondary: gray[400],
    textMuted: gray[500],
    textOnPrimary: '#FFFFFF',

    // Borders
    border: gray[700],
    borderLight: gray[800],

    // Status colors
    success: sapphire[400],
    warning: amber[400],
    danger: red[400],
    info: blue[400],

    // Component-specific
    tint: sapphire[500],
    icon: gray[400],
    tabIconDefault: gray[500],
    tabIconSelected: sapphire[400],
    tabBarBackground: '#1E293B',

    // Gradient sets
    heroGradient: ['#0F172A', sapphire[900]] as [string, string],
    buttonGradient: [sapphire[700], sapphire[600]] as [string, string],
    splashGradient: ['#030712', sapphire[950]] as [string, string],

    // Input
    inputBackground: '#1E293B',
    inputBorder: gray[700],
    inputFocusBorder: sapphire[400],
    placeholder: gray[500],

    // Cards
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    cardShadowElevated: 'rgba(0, 0, 0, 0.5)',

    // Status badges
    onlineDot: sapphire[400],
    offlineDot: red[400],

    // Chat
    myBubble: sapphire[700],
    myBubbleText: '#FFFFFF',
    theirBubble: gray[800],
    theirBubbleText: gray[50],
  },
};

// ─── Shared Design Tokens ───────────────────────────────────
export const DesignTokens = {
  radius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 6,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
  },
  font: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },
  fontSize: {
    caption: 11,
    small: 12,
    body: 14,
    bodyLarge: 16,
    title: 20,
    heading: 24,
    hero: 28,
    display: 32,
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
