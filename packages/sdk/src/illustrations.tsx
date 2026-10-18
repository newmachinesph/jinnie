import {useMemo} from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {artwork, plates} from './artwork.generated';
import {useTheme} from './theme';

export type IllustrationId = keyof typeof artwork;
export const ILLUSTRATION_IDS = Object.keys(artwork) as IllustrationId[];

/**
 * A Learn course drawing, rendered the way the course renders it: tonal
 * plates behind indigo lines, lamp-gold details. Colours come from the theme
 * unless overridden, so the same picture reads in dark mode.
 */
export function Illustration({
  id,
  size = 96,
  color,
  gold,
  style,
}: {
  id: IllustrationId;
  size?: number;
  color?: string;
  gold?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const ink = color ?? t.primary;
  const glyph = gold ?? t.gold;
  const xml = useMemo(() => markup(id, ink, glyph, t.card), [id, ink, glyph, t.card]);
  return <SvgXml xml={xml} width={size} height={size} style={style} />;
}

/** The course's CSS variables become concrete colours; SvgXml has no cascade. */
function markup(id: IllustrationId, ink: string, gold: string, card: string): string {
  const body = `${plates[id] ?? ''}<g>${artwork[id]}</g>`
    .replace(/currentColor/g, ink)
    .replace(/var\(--c-gold, #D4AF37\)/g, gold)
    .replace(/var\(--c-card, #FFFFFF\)/g, card);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
