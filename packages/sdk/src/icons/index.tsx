import React from 'react';
import Svg, {Circle, G, Path, Rect} from 'react-native-svg';
import type {IconProps} from '../manifest';

/*
 * Jinnie icon set — custom, stroke-based, drawn on a 24 grid.
 * 1.75 stroke, round caps and joins, one colour. No emoji anywhere.
 * Category glyphs adapted from Lucide (ISC) — https://lucide.dev
 */

const STROKE = 1.75;

function Base({
  size = 24,
  color = '#111827',
  children,
}: IconProps & {children: React.ReactNode}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round">
      {children}
    </Svg>
  );
}

/*
 * The brand mark.
 *
 * Unlike the UI icons above, the mark is drawn on the 120 grid the Learn
 * course's artwork uses (jinnie-web/learn/assets/artwork.js): a genie lamp
 * with 金 engraved in gold on its bowl and two wisps rising from the spout.
 * The character has to stay legible from a 20pt tab bar to a 1024px launcher
 * icon, and a 24 grid cannot hold that much detail without the strokes merging.
 *
 * These strings are the single source of the mark: the RN component below,
 * `packages/host/scripts/make-icons.mjs` and the website's Mark all draw
 * from them, so the glyph cannot drift between surfaces.
 */
export const MARK_VIEWBOX = '0 0 120 120';

/** The lamp: bowl, spout, lid, knob, base, and the two wisps of smoke. */
export const LAMP_PATHS = {
  body: 'M27 67h59c5 0 10-5 18-16l-4 21-14 7c-4 12-15 19-30 19-17 0-28-11-29-31Z',
  spout: 'M28 72C7 73 9 51 22 54c6 1 7 6 6 10',
  lid: 'M34 66c3-10 11-15 22-15s19 5 23 15',
  knob: 'M52 51v-5a4 4 0 0 1 8 0v5',
  base: 'M45 99l-3 6h29l-4-6',
  wisps: 'M54 33c-8-9 10-10 3-20M72 37c-4-6 7-8 5-14',
};

/** Tonal plates behind the lines — the bowl and the lid at 12% of the line colour. */
export const LAMP_PLATES = [LAMP_PATHS.body, 'M34 66c3-20 38-20 45 0Z'];

/**
 * 金 (jīn) — gold, wealth — drawn as strokes rather than set as text, in gold.
 *
 * The launcher icon is rasterized off-device, where no CJK font is guaranteed,
 * and a mark that renders differently in two places is not a mark.
 */
export const JIN_PATH = 'm47 78 10-7 10 7M51 79h12M49 84h16M57 79v14M50 87l2 3m12-3-2 3M47 94h20';

/** Decorative lamp gold; the light palette's `gold`. */
export const MARK_GOLD = '#D4AF37';

/**
 * The brand mark: the lamp with 金 in gold on its bowl. `color` draws the
 * lines and the tonal plates, `gold` the character.
 */
export function IconLogo({size = 24, color = '#111827', gold = MARK_GOLD}: IconProps & {gold?: string}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={MARK_VIEWBOX}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round">
      <G fill={color} opacity={0.12} stroke="none">
        {LAMP_PLATES.map(d => (
          <Path key={d} d={d} />
        ))}
      </G>
      {Object.values(LAMP_PATHS).map(d => (
        <Path key={d} d={d} />
      ))}
      <Path d={JIN_PATH} stroke={gold} strokeWidth={2.2} />
    </Svg>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M3.5 7.5a2 2 0 0 1 2-2h11l3 0a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <Path d="M3.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h10" />
      <Path d="M15.5 12.5h5v4h-5a2 2 0 1 1 0-4z" />
    </Base>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <Base {...props}>
      <Circle cx="12" cy="12" r="8.5" />
      <Circle cx="12" cy="12" r="4.75" />
      <Circle cx="12" cy="12" r="1" fill={props.color ?? '#111827'} stroke="none" />
    </Base>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6-2.4-1.6z" />
      <Path d="M9 8h6M9 11.5h6M9 15h3.5" />
    </Base>
  );
}

export function IconScale(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M12 4v16M8 20h8" />
      <Path d="M5 7h14" />
      <Path d="M5 7l-2.5 5.5a3 3 0 0 0 5 0zM19 7l-2.5 5.5a3 3 0 0 0 5 0z" />
    </Base>
  );
}

export function IconCircleGroup(props: IconProps) {
  return (
    <Base {...props}>
      <Circle cx="12" cy="6.5" r="2.5" />
      <Circle cx="5.5" cy="15.5" r="2.5" />
      <Circle cx="18.5" cy="15.5" r="2.5" />
      <Path d="M9.9 8.2 7 13.3M14.1 8.2 17 13.3M8 15.5h8" />
    </Base>
  );
}

export function IconSend(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M20.5 3.5 3.5 10l6.5 2.5L12.5 19z" />
      <Path d="M20.5 3.5 10 12.5" />
    </Base>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" />
      <Path d="M6.5 6.5 7.5 20a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13.5" />
      <Path d="M10 10.5v7M14 10.5v7" />
    </Base>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M4 20h4l11-11a2.5 2.5 0 0 0-4-4L4 16z" />
      <Path d="m13.5 6.5 4 4M4 16l4 4" />
    </Base>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M4.5 12.5 10 18 19.5 6.5" />
    </Base>
  );
}

export function IconEye(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M2.75 12s3.35-6 9.25-6 9.25 6 9.25 6-3.35 6-9.25 6-9.25-6-9.25-6z" />
      <Circle cx="12" cy="12" r="2.75" />
    </Base>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="m3.5 3.5 17 17" />
      <Path d="M9.9 6.25A8.8 8.8 0 0 1 12 6c5.9 0 9.25 6 9.25 6a13.7 13.7 0 0 1-2.45 3.2M6.15 7.45A15.1 15.1 0 0 0 2.75 12s3.35 6 9.25 6a8.7 8.7 0 0 0 2.2-.28" />
      <Path d="M10.05 10.05a2.75 2.75 0 0 0 3.9 3.9" />
    </Base>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M14.5 5.5 8 12l6.5 6.5" />
    </Base>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Base>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="m5.5 9 6.5 6.5L18.5 9" />
    </Base>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M12 3 5 5.75v5.5c0 4.4 3 8 7 9.25 4-1.25 7-4.85 7-9.25v-5.5z" />
      <Path d="M9 11.75 11.25 14 15.5 9.5" />
    </Base>
  );
}

/** The gear: Settings, which lives in the shell rather than the launcher. */
export function IconSettings(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <Circle cx={12} cy={12} r={3} />
    </Base>
  );
}

export function IconOffline(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M5 12.5a8.5 8.5 0 0 1 14 0" opacity={0.4} />
      <Path d="M8 15.5a4.5 4.5 0 0 1 8 0" />
      <Circle cx="12" cy="19" r="1" fill={props.color ?? '#111827'} stroke="none" />
    </Base>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M6.5 17.5 17.5 6.5M8.5 6.5h9v9" />
    </Base>
  );
}

export function IconArrowDownLeft(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M17.5 6.5 6.5 17.5M15.5 17.5h-9v-9" />
    </Base>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M4 20V4M4 20h16" />
      <Path d="M7.5 15.5 11 11l3 2.5 5-6.5" />
    </Base>
  );
}

export function IconBudget(props: IconProps) {
  return (
    <Base {...props}>
      <Rect x="3.5" y="4" width="17" height="16" rx="2" />
      <Path d="M7.5 16v-4M12 16V8M16.5 16v-6" />
      <Path d="M7 7.5h1M16 7.5h1" />
    </Base>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Base {...props}>
      <Circle cx="10.5" cy="10.5" r="6.5" />
      <Path d="m15.5 15.5 5 5" />
    </Base>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="m6 6 12 12M18 6 6 18" />
    </Base>
  );
}

export function IconTransfer(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />
    </Base>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M4 8.5h16v11H4zM3 4.5h18v4H3z" />
      <Path d="M9 12.5h6" />
    </Base>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M12 16V4M7.5 8.5 12 4l4.5 4.5" />
      <Path d="M4 14v5.5h16V14" />
    </Base>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M12 4v12M7.5 11.5 12 16l4.5-4.5" />
      <Path d="M4 14v5.5h16V14" />
    </Base>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <Base {...props}>
      <Rect x="4" y="4" width="7" height="7" rx="1.5" />
      <Rect x="13" y="4" width="7" height="7" rx="1.5" />
      <Rect x="4" y="13" width="7" height="7" rx="1.5" />
      <Rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Base>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="m3.5 10 8.5-7 8.5 7" />
      <Path d="M5.5 8.5v11h13v-11M9.5 19.5v-6h5v6" />
    </Base>
  );
}

export function IconBank(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M3.5 9h17L12 3.5zM5 19.5h14M4 22h16" />
      <Path d="M6.5 9v10.5M10.25 9v10.5M13.75 9v10.5M17.5 9v10.5" />
    </Base>
  );
}

export function IconCard(props: IconProps) {
  return (
    <Base {...props}>
      <Rect x="3" y="5" width="18" height="14" rx="2.5" />
      <Path d="M3 9.5h18M7 15h4" />
    </Base>
  );
}

export function IconCash(props: IconProps) {
  return (
    <Base {...props}>
      <Rect width="20" height="12" x="2" y="6" rx="2" />
      <Circle cx="12" cy="12" r="2" />
      <Path d="M6 12h.01M18 12h.01" />
    </Base>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <Base {...props}>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <Path d="M2 12h20" />
    </Base>
  );
}

export function IconFood(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <Path d="M7 2v20" />
      <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </Base>
  );
}

export function IconTransport(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M8 6v6" />
      <Path d="M15 6v6" />
      <Path d="M2 12h19.6" />
      <Path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
      <Circle cx="7" cy="18" r="2" />
      <Path d="M9 18h5" />
      <Circle cx="16" cy="18" r="2" />
    </Base>
  );
}

export function IconUtilities(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
      <Path d="m2 22 3-3" />
      <Path d="M7.5 13.5 10 11" />
      <Path d="M10.5 16.5 13 14" />
      <Path d="m18 3-4 4h6l-4 4" />
    </Base>
  );
}

export function IconHealth(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
      <Path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </Base>
  );
}

export function IconEducation(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <Path d="M22 10v6" />
      <Path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </Base>
  );
}

export function IconGovernment(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M10 18v-7" />
      <Path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z" />
      <Path d="M14 18v-7" />
      <Path d="M18 18v-7" />
      <Path d="M3 22h18" />
      <Path d="M6 18v-7" />
    </Base>
  );
}

export function IconOther(props: IconProps) {
  return (
    <Base {...props}>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M17 12h.01" />
      <Path d="M12 12h.01" />
      <Path d="M7 12h.01" />
    </Base>
  );
}

export function IconFootprints(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
      <Path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
      <Path d="M16 17h4" />
      <Path d="M4 13h4" />
    </Base>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="m17 2 4 4-4 4" />
      <Path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <Path d="m7 22-4-4 4-4" />
      <Path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Base>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Base {...props}>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Path d="M16 3.128a4 4 0 0 1 0 7.744" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Circle cx="9" cy="7" r="4" />
    </Base>
  );
}

const set: Record<string, unknown> = {
  IconLogo, IconWallet, IconTarget, IconReceipt, IconScale, IconCircleGroup, IconSend, IconPlus, IconTrash,
  IconEdit, IconCheck, IconEye, IconEyeOff, IconChevronLeft, IconChevronRight, IconChevronDown, IconShield, IconSettings,
  IconOffline, IconArrowUpRight, IconArrowDownLeft, IconChart, IconBudget, IconSearch, IconClose, IconTransfer,
  IconArchive, IconUpload, IconDownload, IconGrid, IconHome, IconBank, IconCard, IconCash, IconGlobe, IconFood,
  IconTransport, IconUtilities, IconHealth, IconEducation, IconGovernment, IconOther, IconFootprints, IconRepeat,
  IconUsers,
};

/** An icon by name, as an apps manifest carries it. Unknown names fall back to the grid. */
export function getIcon(name: string): React.ComponentType<IconProps> {
  const icon = set[name];
  return typeof icon === 'function' ? (icon as React.ComponentType<IconProps>) : IconGrid;
}
