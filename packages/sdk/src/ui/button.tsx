import {type ReactNode} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {radius, space, useTheme, withAlpha, type Palette} from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

function variantColors(t: Palette, variant: ButtonVariant) {
  switch (variant) {
    case 'secondary':
      return {bg: t.card, fg: t.ink, border: t.line};
    case 'ghost':
      return {bg: 'transparent', fg: t.muted, border: 'transparent'};
    case 'danger':
      return {bg: withAlpha(t.negative, 0.12), fg: t.negative, border: 'transparent'};
    default:
      return {bg: t.primary, fg: t.onPrimary, border: 'transparent'};
  }
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const {bg, fg, border} = variantColors(t, variant);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{disabled: Boolean(disabled)}}
      accessibilityLabel={accessibilityLabel}
      style={({pressed}) => [
        styles.button,
        {backgroundColor: bg, borderColor: border},
        border !== 'transparent' && styles.bordered,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, {color: fg}]} numberOfLines={1}>
        {children}
      </Text>
    </Pressable>
  );
}

/** A 44pt icon-only action. The accessible label is required, not optional. */
export function IconButton({
  label,
  icon,
  onPress,
  tone = 'neutral',
  disabled,
  style,
}: {
  label: string;
  icon: ReactNode;
  onPress?: () => void;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled: Boolean(disabled)}}
      style={({pressed}) => [
        styles.iconButton,
        pressed && {
          backgroundColor: tone === 'danger' ? withAlpha(t.negative, 0.1) : t.line,
        },
        disabled && styles.disabled,
        style,
      ]}>
      {icon}
    </Pressable>
  );
}

/** A card that is itself the tap target — used for every list row. */
export function PressableCard({
  label,
  children,
  onPress,
  disabled,
  style,
  contentStyle,
}: {
  label: string;
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({pressed}) => [
        styles.pressableCard,
        {backgroundColor: t.card, borderColor: t.line},
        pressed && !disabled && {backgroundColor: t.surface},
        disabled && styles.disabled,
        style,
      ]}>
      <View style={[styles.pressableCardInner, contentStyle]}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bordered: {borderWidth: StyleSheet.hairlineWidth},
  label: {fontSize: 14, fontWeight: '600'},
  icon: {flexShrink: 0},
  disabled: {opacity: 0.4},
  pressed: {opacity: 0.85},

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  pressableCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  pressableCardInner: {padding: space.md, minHeight: 44, justifyContent: 'center'},
});
