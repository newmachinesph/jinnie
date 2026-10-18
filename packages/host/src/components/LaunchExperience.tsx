import {useEffect, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {
  Button,
  Dialog,
  IconLogo,
  Input,
  MAX_PROFILE_NAME,
  Progress,
  Row,
  preferences,
  radius,
  space,
  useProfileStore,
  useTheme,
  withAlpha,
} from '@jinnie/sdk';

const ONBOARDING_COMPLETED_KEY = 'onboarding.completed';

const slides = [
  {
    title: 'See every account clearly',
    description:
      'Bring banks, e-wallets, cards, cash, and foreign-currency balances into one private view.',
    detail:
      'Each account keeps its own currency while Home shows a consistent peso net worth.',
    image: require('../../assets/onboarding/accounts.png'),
  },
  {
    title: 'Plan the whole month',
    description:
      'Wallet activity connects with Bills, Budget, and Insights so each entry has a useful next step.',
    detail:
      'Record expenses and income, move money between your accounts, and reconcile bills when they are paid.',
    image: require('../../assets/onboarding/month.png'),
  },
  {
    title: 'Private, and usable offline',
    description:
      'Your records stay on this device by default and remain available when your connection drops.',
    detail:
      'Hide financial values around other people, then export or restore a local backup whenever you need one.',
    image: require('../../assets/onboarding/offline.png'),
  },
] as const;

/** The brand moment: the lamp on its indigo ground. */
export function SplashScreen() {
  const t = useTheme();
  return (
    <View style={[styles.splash, {backgroundColor: t.night}]}>
      <IconLogo size={72} color={t.onNight} />
      <Text style={[styles.splashName, {color: t.onNight}]}>Jinnie</Text>
      <Text style={[styles.splashTagline, {color: t.onNightMuted}]}>Wealth, in order.</Text>
      <Progress
        value={65}
        color={t.accent}
        trackColor={withAlpha(t.onNight, 0.18)}
        style={styles.splashProgress}
      />
    </View>
  );
}

/**
 * The first-run walkthrough. Replayable from Settings, so it is driven by a
 * prop rather than only by stored state.
 */
function Dots({index, count}: {index: number; count: number}) {
  const t = useTheme();
  return (
    <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${count}`}>
      {Array.from({length: count}, (_, dotIndex) => (
        <View
          key={dotIndex}
          style={[
            styles.dot,
            {backgroundColor: dotIndex === index ? t.primary : t.line},
            dotIndex === index && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * The tour can be skipped; the name step cannot. Home greets the user by it,
 * so "Skip" jumps to that step rather than past it, and a replay from
 * Settings starts with the stored name filled in.
 */
export function OnboardingCarousel({
  onDone,
  onRestore,
}: {
  onDone: () => void;
  onRestore: () => void;
}) {
  const t = useTheme();
  const storedName = useProfileStore(state => state.name);
  const saveName = useProfileStore(state => state.setName);
  const [index, setIndex] = useState(0);
  const [name, setName] = useState(storedName);

  const stepCount = slides.length + 1;
  const goToName = () => setIndex(slides.length);
  const canFinish = name.trim().length > 0;

  const finish = () => {
    if (!canFinish) return;
    saveName(name);
    onDone();
  };

  if (index === slides.length) {
    return (
      <Dialog
        title="What should we call you?"
        description="Home greets you by this name. It stays on this device."
        onClose={() => {}}>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Your name or nickname"
          accessibilityLabel="Your name or nickname"
          autoCapitalize="words"
          maxLength={MAX_PROFILE_NAME}
          returnKeyType="done"
          onSubmitEditing={finish}
        />
        <Dots index={index} count={stepCount} />
        <Button disabled={!canFinish} onPress={finish} style={styles.actions}>
          Get started
        </Button>
      </Dialog>
    );
  }

  const slide = slides[index];

  return (
    <Dialog title={slide.title} description={slide.description} onClose={goToName}>
      <View
        style={[
          styles.detail,
          {borderColor: withAlpha(t.primary, 0.24), backgroundColor: withAlpha(t.primary, 0.05)},
        ]}>
        {/* The course's illustration style; the pale ground doubles as a panel in dark mode. */}
        <Image source={slide.image} style={styles.detailImage} accessibilityIgnoresInvertColors />
        <Text style={[styles.detailText, {color: t.ink}]}>{slide.detail}</Text>
      </View>

      <Dots index={index} count={stepCount} />

      <Row gap={space.md} style={styles.actions}>
        <Button variant="secondary" onPress={goToName} style={styles.flex1}>
          Skip
        </Button>
        <Button onPress={() => setIndex(current => current + 1)} style={styles.flex1}>
          Next
        </Button>
      </Row>
      {index === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restore from a backup"
          onPress={onRestore}
          style={styles.restore}>
          <Text style={[styles.restoreText, {color: t.primary}]}>
            Already used Jinnie? Restore from a backup
          </Text>
        </Pressable>
      ) : null}
    </Dialog>
  );
}

export async function markOnboardingComplete(): Promise<void> {
  await preferences.set(ONBOARDING_COMPLETED_KEY, 'true');
}

/** `undefined` while the answer is still being read from storage. */
export function useOnboardingNeeded(): boolean | undefined {
  const [needed, setNeeded] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void preferences.get(ONBOARDING_COMPLETED_KEY).then(value => {
      if (!cancelled) setNeeded(value !== 'true');
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return needed;
}

const styles = StyleSheet.create({
  splash: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl},
  splashName: {fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginTop: space.lg},
  splashTagline: {fontSize: 12, marginTop: 4},
  splashProgress: {width: 96, marginTop: space.xxl, height: 3},

  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: space.lg,
    minHeight: 112,
  },
  detailImage: {width: 96, height: 96, borderRadius: radius.card, flexShrink: 0},
  detailText: {flex: 1, fontSize: 12, lineHeight: 18},

  dots: {flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.lg},
  dot: {height: 5, width: 5, borderRadius: radius.pill},
  dotActive: {width: 22},

  actions: {marginTop: space.xl},
  restore: {marginTop: space.md, minHeight: 40, alignItems: 'center', justifyContent: 'center'},
  restoreText: {fontSize: 12, fontWeight: '600'},
  flex1: {flex: 1},
});
