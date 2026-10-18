import {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  Card,
  IconBank,
  IconBudget,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconButton,
  Progress,
  SectionHeader,
  IconWallet,
  preferences,
  radius,
  space,
  useAccountsStore,
  useBudgetStore,
  useTheme,
  useWalletStore,
  withAlpha,
} from '@jinnie/sdk';

const DISMISSED_KEY = 'onboarding.guide.dismissed';

/**
 * The three things that make the rest of the product work. Disappears on its
 * own once all three are done, so it never becomes furniture.
 */
export function OnboardingGuide({onOpenApp}: {onOpenApp: (id: string) => void}) {
  const t = useTheme();
  const [dismissed, setDismissed] = useState<boolean | undefined>(undefined);

  const hasAccounts = useAccountsStore(state =>
    state.accounts.some(account => !account.archivedAt),
  );
  const hasActivity = useWalletStore(state => state.transactions.length > 0);
  const hasBudget = useBudgetStore(state => state.limits.length > 0);

  useEffect(() => {
    let cancelled = false;
    void preferences.get(DISMISSED_KEY).then(value => {
      if (!cancelled) setDismissed(value === 'true');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = [
    {
      id: 'accounts',
      label: 'Add your accounts',
      description: 'E-wallets, banks, cards, and foreign currencies',
      complete: hasAccounts,
      icon: IconBank,
    },
    {
      id: 'wallet',
      label: 'Record money activity',
      description: 'Add an expense, income, or account transfer',
      complete: hasActivity,
      icon: IconWallet,
    },
    {
      id: 'budget',
      label: 'Set a monthly budget',
      description: 'Give your regular spending a clear limit',
      complete: hasBudget,
      icon: IconBudget,
    },
  ];
  const completed = steps.filter(step => step.complete).length;

  if (dismissed !== false || completed === steps.length) return null;

  const dismiss = () => {
    setDismissed(true);
    void preferences.set(DISMISSED_KEY, 'true');
  };

  return (
    <Card
      style={{
        borderColor: withAlpha(t.primary, 0.28),
        backgroundColor: withAlpha(t.primary, 0.04),
      }}>
      <SectionHeader
        title="Set up your money view"
        description={`${completed} of ${steps.length} essentials complete`}
        action={
          <IconButton
            label="Dismiss setup guide"
            icon={<IconClose size={16} color={t.muted} />}
            onPress={dismiss}
          />
        }
      />
      <Progress value={(completed / steps.length) * 100} style={styles.progress} />
      <View style={styles.steps}>
        {steps.map(step => {
          const StepIcon = step.icon;
          return (
            <Pressable
              key={step.id}
              onPress={() => onOpenApp(step.id)}
              accessibilityRole="button"
              accessibilityLabel={`${step.label}${step.complete ? ', complete' : ''}`}
              style={({pressed}) => [
                styles.step,
                {borderTopColor: t.line},
                pressed && {opacity: 0.7},
              ]}>
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor: step.complete
                      ? withAlpha(t.positive, 0.12)
                      : t.line,
                  },
                ]}>
                {step.complete ? (
                  <IconCheck size={16} color={t.positive} />
                ) : (
                  <StepIcon size={16} color={t.muted} />
                )}
              </View>
              <View style={styles.stepText}>
                <Text style={[styles.stepLabel, {color: t.ink}]}>{step.label}</Text>
                <Text style={[styles.stepDescription, {color: t.muted}]}>
                  {step.description}
                </Text>
              </View>
              <IconChevronRight size={16} color={t.muted} />
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  progress: {marginTop: space.md},
  steps: {marginTop: space.md},
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: {flex: 1, minWidth: 0},
  stepLabel: {fontSize: 13, fontWeight: '600'},
  stepDescription: {fontSize: 11, lineHeight: 15, marginTop: 2},
});
