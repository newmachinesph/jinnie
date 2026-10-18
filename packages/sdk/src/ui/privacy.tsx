import {type ReactNode} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import {radius, useTheme, withAlpha} from '../theme';
import {usePrivacy} from '../stores/privacy';
import {IconEye, IconEyeOff} from '../icons';

/**
 * Wraps any figure the user may not want visible over their shoulder. When
 * privacy is on the value is replaced with dots and the screen reader is told
 * only that a value is hidden — never the amount.
 *
 * A figure is one line and must never clip to an ellipsis, so it shrinks to
 * fit by default. Pass `numberOfLines` or `adjustsFontSizeToFit` to override.
 */
export function PrivateValue({
  children,
  style,
  hiddenLabel = 'Hidden financial value',
  numberOfLines = 1,
  adjustsFontSizeToFit = true,
  minimumFontScale = 0.6,
  ...rest
}: TextProps & {hiddenLabel?: string}) {
  const {valuesHidden} = usePrivacy();
  if (valuesHidden) {
    return (
      <Text style={[styles.dots, style]} accessibilityLabel={hiddenLabel} numberOfLines={1}>
        ••••
      </Text>
    );
  }
  return (
    <Text
      {...rest}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      style={style}>
      {children}
    </Text>
  );
}

/** Inline variant for use inside a surrounding <Text> run. */
export function PrivateText({
  children,
  hiddenLabel = 'Hidden financial value',
}: {
  children: ReactNode;
  hiddenLabel?: string;
}) {
  const {valuesHidden} = usePrivacy();
  if (valuesHidden) {
    return (
      <Text accessibilityLabel={hiddenLabel} style={styles.dotsInline}>
        ••••
      </Text>
    );
  }
  return <>{children}</>;
}

export function PrivacyToggle({
  size = 20,
  color,
  style,
}: {
  size?: number;
  color?: string;
  /** Replaces the default 44pt hit box, e.g. to sit inside a card as its own tile. */
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const {valuesHidden, toggleValues} = usePrivacy();
  const label = valuesHidden ? 'Show financial values' : 'Hide financial values';
  const Icon = valuesHidden ? IconEyeOff : IconEye;

  return (
    <Pressable
      onPress={toggleValues}
      accessibilityRole="switch"
      accessibilityState={{checked: valuesHidden}}
      accessibilityLabel={label}
      hitSlop={6}
      style={({pressed}) => [
        styles.toggle,
        style,
        pressed && {backgroundColor: color ? withAlpha(color, 0.18) : t.line},
      ]}>
      <Icon size={size} color={color ?? t.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dots: {letterSpacing: 2},
  dotsInline: {letterSpacing: 2},
  toggle: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
