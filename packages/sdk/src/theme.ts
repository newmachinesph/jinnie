import {useColorScheme, type TextStyle} from 'react-native';

/*
 * Jinnie design tokens.
 *
 * The mark is a genie lamp carrying 金 (jīn) — gold, wealth. The palette
 * follows it: a deep indigo night for the surfaces that hold a total, and a
 * single lamp-gold accent that is spent sparingly. Light is the primary
 * presentation; dark follows the system setting.
 *
 * Geometry is compact — nothing rounder than 4pt except the brand tiles.
 */

export interface Palette {
  primary: string;
  primaryDeep: string;
  onPrimary: string;
  /** Lamp gold. Warnings and highlights only — never a default. */
  accent: string;
  /** Decorative lamp gold: the 金 on the mark, sparkles, illustration highlights. Text uses `accent`. */
  gold: string;
  ink: string;
  muted: string;
  surface: string;
  card: string;
  line: string;
  positive: string;
  negative: string;
  /** Deep indigo ground for the net-worth card, splash, and brand tiles. */
  night: string;
  onNight: string;
  onNightMuted: string;
  scrim: string;
}

const light: Palette = {
  primary: '#4338CA', // indigo-700 — actions, links, brand
  primaryDeep: '#312E81', // indigo-900 — headings, pressed states
  onPrimary: '#FFFFFF',
  accent: '#A16207', // yellow-700 — lamp gold at text contrast
  gold: '#D4AF37',
  ink: '#111827',
  muted: '#6B7280',
  surface: '#F7F7FB',
  card: '#FFFFFF',
  line: '#E4E4ED',
  positive: '#047857',
  negative: '#B91C1C',
  night: '#1E1B4B', // indigo-950
  onNight: '#FFFFFF',
  onNightMuted: 'rgba(255,255,255,0.66)',
  scrim: 'rgba(17,18,38,0.48)',
};

const dark: Palette = {
  primary: '#A5B4FC', // indigo-300
  primaryDeep: '#C7D2FE',
  onPrimary: '#1E1B4B',
  accent: '#FBBF24',
  gold: '#F2C86B',
  ink: '#F3F4F6',
  muted: '#9AA0AE',
  surface: '#0B0B14',
  card: '#15162A',
  line: '#262740',
  positive: '#34D399',
  negative: '#F87171',
  night: '#181735',
  onNight: '#EEF0FF',
  onNightMuted: 'rgba(238,240,255,0.62)',
  scrim: 'rgba(4,4,12,0.62)',
};

export const palettes = {light, dark} as const;

/** Spacing scale. Multiples of 4, named for intent rather than size. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  /** Product geometry: controls and cards stay at 4. */
  control: 4,
  card: 4,
  /** Brand tiles and the launcher key only. */
  brand: 14,
  pill: 999,
} as const;

export const typography = {
  hero: {fontSize: 30, fontWeight: '700', letterSpacing: -0.6},
  title: {fontSize: 20, fontWeight: '700', letterSpacing: -0.3},
  section: {fontSize: 14, fontWeight: '600'},
  body: {fontSize: 14, fontWeight: '400'},
  label: {fontSize: 12, fontWeight: '500'},
  meta: {fontSize: 11, fontWeight: '400'},
  micro: {fontSize: 10, fontWeight: '600'},
} as const;

/**
 * Money and other figures that line up in a column. Hermes exposes the
 * platform's tabular figures through this family on both platforms.
 */
export const tnum: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/**
 * Accent tones for launcher tiles, provider marks, and biller marks. Named
 * rather than hex so a mini app never hardcodes a colour, and so the whole set
 * restates itself correctly in dark mode.
 */
export type Tone =
  | 'indigo'
  | 'gold'
  | 'emerald'
  | 'blue'
  | 'sky'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'slate';

//                    light text  dark text
const toneInk: Record<Tone, [string, string]> = {
  indigo: ['#4338CA', '#A5B4FC'],
  gold: ['#A16207', '#FBBF24'],
  emerald: ['#047857', '#34D399'],
  blue: ['#1D4ED8', '#93C5FD'],
  sky: ['#0369A1', '#7DD3FC'],
  violet: ['#6D28D9', '#C4B5FD'],
  amber: ['#B45309', '#FCD34D'],
  rose: ['#BE123C', '#FDA4AF'],
  slate: ['#475569', '#A8B0C0'],
};

/** Hex to rgba, so tones stay readable as hex in the table above. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface ToneColors {
  fg: string;
  bg: string;
}

export function toneColors(tone: Tone, isDark: boolean): ToneColors {
  const fg = toneInk[tone][isDark ? 1 : 0];
  return {fg, bg: withAlpha(fg, isDark ? 0.18 : 0.1)};
}

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

export function useToneColors(tone: Tone): ToneColors {
  return toneColors(tone, useIsDark());
}
