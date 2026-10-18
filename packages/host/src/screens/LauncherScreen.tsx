import {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  FIXED_APPS,
  IconButton,
  IconEdit,
  IconSettings,
  Sheet,
  Switch,
  getIcon,
  useApps,
  useLauncherStore,
  radius,
  space,
  toneColors,
  useIsDark,
  useTheme,
} from '@jinnie/sdk';
import {OnboardingGuide} from '../components/OnboardingGuide';

const SECTIONS = [
  {kind: 'core', label: 'Core'},
  {kind: 'community', label: 'Community'},
] as const;

export function LauncherScreen({onOpenApp}: {onOpenApp: (id: string) => void}) {
  const t = useTheme();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const hidden = useLauncherStore(state => state.hidden);
  const apps = useApps().filter(app => !hidden.includes(app.id));
  const [choosing, setChoosing] = useState(false);

  return (
    <ScrollView
      style={{backgroundColor: t.surface}}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + space.lg}]}>
      <View>
        <View style={styles.heading}>
          <Text style={[styles.title, styles.flexMin, {color: t.ink}]}>Your money, in order.</Text>
          <IconButton
            label="Settings"
            icon={<IconSettings size={18} color={t.muted} />}
            onPress={() => onOpenApp('settings')}
          />
          <IconButton
            label="Choose which apps to show"
            icon={<IconEdit size={18} color={t.muted} />}
            onPress={() => setChoosing(true)}
          />
        </View>
        <Text style={[styles.subtitle, {color: t.muted}]}>
          Every app below works offline. Your data never leaves this device.
        </Text>
      </View>

      <OnboardingGuide onOpenApp={onOpenApp} />

      {SECTIONS.filter(section => apps.some(app => app.kind === section.kind)).map(section => (
        <View key={section.kind} accessibilityLabel={`${section.label} apps`}>
          <Text style={[styles.sectionLabel, {color: t.muted}]}>
            {section.label.toUpperCase()}
          </Text>
          <View style={styles.grid}>
            {apps
              .filter(app => app.kind === section.kind)
              .map(app => {
                const Icon = getIcon(app.icon);
                const tone = toneColors(app.tone, isDark);
                return (
                  <Pressable
                    key={app.id}
                    onPress={() => onOpenApp(app.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${app.name}`}
                    accessibilityHint={app.description}
                    style={({pressed}) => [
                      styles.tile,
                      {backgroundColor: t.card, borderColor: t.line},
                      pressed && {borderColor: t.primary, opacity: 0.9},
                    ]}>
                    <View style={[styles.tileIcon, {backgroundColor: tone.bg}]}>
                      <Icon size={20} color={tone.fg} />
                    </View>
                    <Text style={[styles.tileName, {color: t.ink}]} numberOfLines={1}>
                      {app.name}
                    </Text>
                    <Text
                      style={[styles.tileDescription, {color: t.muted}]}
                      numberOfLines={2}>
                      {app.description}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      ))}

      {choosing ? <ChooseAppsSheet onClose={() => setChoosing(false)} /> : null}
    </ScrollView>
  );
}

/** Which apps the launcher shows. The tabs and Security always do; Settings lives in the gear. */
function ChooseAppsSheet({onClose}: {onClose: () => void}) {
  const apps = useApps().filter(app => app.kind !== 'system');
  const hidden = useLauncherStore(state => state.hidden);
  const setHidden = useLauncherStore(state => state.setHidden);

  return (
    <Sheet
      eyebrow="Launcher"
      title="Choose your apps"
      description="Keep only what you use. Hidden apps keep their data and come back when switched on."
      onClose={onClose}>
      <View style={styles.choices}>
        {apps.map(app => {
          const fixed = FIXED_APPS.includes(app.id);
          return (
            <Switch
              key={app.id}
              checked={fixed || !hidden.includes(app.id)}
              onChange={next => setHidden(app.id, !next)}
              label={app.name}
              description={fixed ? 'Always shown' : undefined}
              disabled={fixed}
            />
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {padding: space.lg, paddingBottom: 40, gap: space.xl},
  title: {fontSize: 21, fontWeight: '700', letterSpacing: -0.4},
  subtitle: {fontSize: 13, lineHeight: 19, marginTop: space.xs},
  heading: {flexDirection: 'row', alignItems: 'center', gap: space.md},
  flexMin: {flex: 1},
  choices: {gap: space.sm},
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: space.md,
  },
  // Two columns. The gutter is the leftover 4%, not a `gap` — 48% + 48% + a
  // 12pt gap exceeds 100% on a 320pt screen and silently drops to one column.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.md,
  },
  tile: {
    width: '48%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: space.lg,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  tileName: {fontSize: 14, fontWeight: '600'},
  tileDescription: {fontSize: 11, lineHeight: 15, marginTop: 3},
});
