import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {
  IconBank,
  IconGrid,
  IconHome,
  IconLogo,
  IconReceipt,
  IconWallet,
  radius,
  space,
  useTheme,
  withAlpha,
  type IconProps,
} from '@jinnie/sdk';

const ICONS: Record<string, React.ComponentType<IconProps>> = {
  Home: IconHome,
  Wallet: IconWallet,
  Apps: IconGrid,
  Accounts: IconBank,
  Bills: IconReceipt,
};

/**
 * The launcher key sits raised in the middle of the bar — the one place the
 * product breaks its own flat geometry, because opening the app grid is the
 * gesture the whole shell is built around.
 */
export function TabBar({state, descriptors, navigation}: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: t.card,
          borderTopColor: t.line,
          paddingBottom: insets.bottom,
        },
      ]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const {options} = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const Icon = ICONS[route.name] ?? IconGrid;
          const isLauncher = route.name === 'Apps';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isLauncher) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={{selected: focused}}
                accessibilityLabel="Open all apps"
                style={styles.launcherSlot}>
                <View
                  style={[
                    styles.launcherKey,
                    {backgroundColor: t.primary},
                    focused && {borderColor: withAlpha(t.primary, 0.24)},
                  ]}>
                  <IconLogo size={30} color={t.onPrimary} />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{selected: focused}}
              accessibilityLabel={label}
              style={styles.slot}>
              <Icon size={21} color={focused ? t.primary : t.muted} />
              <Text
                numberOfLines={1}
                style={[styles.label, {color: focused ? t.primary : t.muted}]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {borderTopWidth: StyleSheet.hairlineWidth},
  row: {flexDirection: 'row', alignItems: 'center', height: 62, paddingHorizontal: space.sm},
  slot: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%'},
  label: {fontSize: 10, fontWeight: '600'},
  launcherSlot: {flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%'},
  launcherKey: {
    width: 54,
    height: 54,
    borderRadius: radius.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 4,
    borderColor: 'transparent',
  },
});
