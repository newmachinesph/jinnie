import React, {type ReactNode} from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {radius, space, tnum, useTheme, withAlpha, type Palette} from '../theme';
import {Illustration, type IllustrationId} from '../illustrations';
import {PrivateValue} from './privacy';

export function Card({
  children,
  style,
  padded = true,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        {backgroundColor: t.card, borderColor: t.line},
        padded && styles.cardPadded,
        style,
      ]}>
      {children}
    </View>
  );
}

export function CardTitle({children}: {children: ReactNode}) {
  const t = useTheme();
  return <Text style={[styles.cardTitle, {color: t.ink}]}>{children}</Text>;
}

// -- Badge -------------------------------------------------------------

export type BadgeTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'accent';

function badgeColors(t: Palette, tone: BadgeTone) {
  switch (tone) {
    case 'positive':
      return {bg: withAlpha(t.positive, 0.12), fg: t.positive};
    case 'negative':
      return {bg: withAlpha(t.negative, 0.12), fg: t.negative};
    case 'warning':
      return {bg: withAlpha(t.accent, 0.14), fg: t.accent};
    case 'accent':
      return {bg: withAlpha(t.primary, 0.12), fg: t.primary};
    default:
      return {bg: t.line, fg: t.muted};
  }
}

export function Badge({
  children,
  tone = 'neutral',
  style,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const {bg, fg} = badgeColors(t, tone);
  return (
    <View style={[styles.badge, {backgroundColor: bg}, style]}>
      <Text style={[styles.badgeText, {color: fg}]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

// -- Progress ----------------------------------------------------------

export function Progress({
  value,
  trackColor,
  color,
  style,
}: {
  /** 0 to 100. Values outside the range are clamped. */
  value: number;
  trackColor?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const pct = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{min: 0, max: 100, now: Math.round(pct)}}
      style={[styles.progressTrack, {backgroundColor: trackColor ?? t.line}, style]}>
      <View
        style={[
          styles.progressBar,
          {width: `${pct}%`, backgroundColor: color ?? t.primary},
        ]}
      />
    </View>
  );
}

// -- Section header ----------------------------------------------------

export function SectionHeader({
  title,
  description,
  action,
  style,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.flexMin}>
        <Text style={[styles.sectionTitle, {color: t.ink}]}>{title}</Text>
        {description !== undefined && description !== null && (
          <Text style={[styles.sectionDescription, {color: t.muted}]}>{description}</Text>
        )}
      </View>
      {action ? <View style={styles.shrink0}>{action}</View> : null}
    </View>
  );
}

// -- Stat --------------------------------------------------------------

export function Stat({
  label,
  value,
  tone = 'ink',
  style,
}: {
  label: string;
  value: string;
  tone?: 'ink' | 'positive' | 'negative';
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const color = tone === 'positive' ? t.positive : tone === 'negative' ? t.negative : t.ink;
  return (
    <Card style={[styles.stat, style]} padded={false}>
      <Text style={[styles.statLabel, {color: t.muted}]} numberOfLines={1}>
        {label}
      </Text>
      <PrivateValue style={[styles.statValue, tnum, {color}]}>{value}</PrivateValue>
    </Card>
  );
}

// -- Skeleton ----------------------------------------------------------

export function Skeleton({style}: {style?: StyleProp<ViewStyle>}) {
  const t = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.skeleton, {backgroundColor: t.line}, style]}
    />
  );
}

// -- Empty state -------------------------------------------------------

export function EmptyState({
  icon,
  illustration,
  title,
  description,
}: {
  icon?: ReactNode;
  /** A Learn course drawing in place of the icon tile. */
  illustration?: IllustrationId;
  title: string;
  description: string;
}) {
  const t = useTheme();
  return (
    <View style={[styles.empty, {borderColor: t.line}]}>
      {illustration ? (
        <Illustration id={illustration} size={72} />
      ) : (
        <View style={[styles.emptyIcon, {backgroundColor: withAlpha(t.primary, 0.1)}]}>
          {icon}
        </View>
      )}
      <Text style={[styles.emptyTitle, {color: t.ink}]}>{title}</Text>
      <Text style={[styles.emptyDescription, {color: t.muted}]}>{description}</Text>
    </View>
  );
}

// -- Inline alert ------------------------------------------------------

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export function InlineAlert({
  title,
  description,
  action,
  tone = 'info',
  style,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: AlertTone;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const color =
    tone === 'success'
      ? t.positive
      : tone === 'warning'
        ? t.accent
        : tone === 'danger'
          ? t.negative
          : t.primary;
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.alert,
        {borderColor: withAlpha(color, 0.28), backgroundColor: withAlpha(color, 0.06)},
        style,
      ]}>
      <View style={styles.flexMin}>
        <Text style={[styles.alertTitle, {color}]}>{title}</Text>
        {description !== undefined && description !== null && (
          <Text style={[styles.alertDescription, {color: t.muted}]}>{description}</Text>
        )}
      </View>
      {action ? <View style={styles.shrink0}>{action}</View> : null}
    </View>
  );
}

// -- App bar -----------------------------------------------------------

export function AppBar({
  leading,
  title,
  subtitle,
  trailing,
  style,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[styles.appBar, style]}>
      {leading ? <View style={styles.shrink0}>{leading}</View> : null}
      <View style={styles.flexMin}>
        <Text style={[styles.appBarTitle, {color: t.ink}]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle !== undefined && subtitle !== null && (
          <Text style={[styles.appBarSubtitle, {color: t.muted}]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing ? <View style={styles.shrink0}>{trailing}</View> : null}
    </View>
  );
}

// -- Layout ------------------------------------------------------------

/** Vertical rhythm container. Replaces the web build's `space-y-*`. */
export function Stack({
  children,
  gap = space.lg,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{gap}, style]}>{children}</View>;
}

/** Horizontal group with even columns. Replaces `grid-cols-*`. */
export function Row({
  children,
  gap = space.md,
  align = 'stretch',
  style,
}: {
  children: ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, {gap, alignItems: align}, style]}>{children}</View>
  );
}

// -- Shared text -------------------------------------------------------

export function Body({children, style, ...rest}: React.ComponentProps<typeof Text>) {
  const t = useTheme();
  return (
    <Text {...rest} style={[styles.body, {color: t.ink}, style]}>
      {children}
    </Text>
  );
}

export function Muted({children, style, ...rest}: React.ComponentProps<typeof Text>) {
  const t = useTheme();
  return (
    <Text {...rest} style={[styles.muted, {color: t.muted}, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.card},
  cardPadded: {padding: space.lg},
  cardTitle: {fontSize: 14, fontWeight: '600'},

  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.control,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {fontSize: 11, fontWeight: '700'},

  // No explicit width: it stretches in a column by default, and in a row the
  // caller's flex decides. Hardcoding 100% breaks the row case.
  progressTrack: {height: 6, borderRadius: radius.pill, overflow: 'hidden'},
  progressBar: {height: '100%', borderRadius: radius.pill},

  sectionHeader: {flexDirection: 'row', alignItems: 'flex-end', gap: space.md},
  sectionTitle: {fontSize: 14, fontWeight: '600'},
  sectionDescription: {fontSize: 12, lineHeight: 17, marginTop: 2},

  stat: {padding: space.md, minWidth: 0, flex: 1},
  statLabel: {fontSize: 11, fontWeight: '500'},
  statValue: {fontSize: 17, fontWeight: '700', marginTop: 2, letterSpacing: -0.3},

  skeleton: {borderRadius: radius.card, opacity: 0.6},

  empty: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    paddingVertical: 36,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  emptyTitle: {fontSize: 14, fontWeight: '600', textAlign: 'center'},
  emptyDescription: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: space.xs,
    maxWidth: 280,
  },

  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: space.md,
  },
  alertTitle: {fontSize: 12, fontWeight: '700'},
  alertDescription: {fontSize: 11, lineHeight: 16, marginTop: 2},

  appBar: {flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44},
  appBarTitle: {fontSize: 15, fontWeight: '700'},
  appBarSubtitle: {fontSize: 11, marginTop: 1},

  body: {fontSize: 14, lineHeight: 20},
  muted: {fontSize: 12, lineHeight: 17},

  row: {flexDirection: 'row'},
  flexMin: {flex: 1, minWidth: 0},
  shrink0: {flexShrink: 0},
});
