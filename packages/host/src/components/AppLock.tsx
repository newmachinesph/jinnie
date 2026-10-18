import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, StyleSheet, Text, View, type AppStateStatus} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Button,
  IconLogo,
  Input,
  PIN_LENGTH,
  appLock,
  space,
  useTheme,
  validPin,
} from '@jinnie/sdk';

/** Time in the background after which the lock comes back. */
const RELOCK_AFTER_MS = 60_000;

/**
 * `locked` is undefined until the keystore has been read, so the shell can
 * keep the splash up rather than flash Home before the lock appears.
 */
export function useAppLock(): {locked: boolean | undefined; unlock: () => void} {
  const [locked, setLocked] = useState<boolean | undefined>(undefined);
  const enabled = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void appLock.isEnabled().then(value => {
      enabled.current = value;
      if (!cancelled) setLocked(value);
    });

    // The decision on resume is synchronous against a cached flag. Reading
    // the keystore at that moment can take seconds on some phones, and a lock
    // that lands mid-task, long after the user came back, reads as a bug.
    const onChange = (state: AppStateStatus) => {
      // Only a true background counts. Android reports 'inactive' whenever the
      // main window loses focus, which a sheet or the keyboard does, and a lock
      // that fires after typing into a form for thirty seconds is not a lock.
      if (state === 'background') {
        if (appLock.isExternalActivityExpected()) return;
        backgroundedAt.current ??= Date.now();
        void appLock.isEnabled().then(value => {
          enabled.current = value;
        });
        return;
      }
      if (state !== 'active') return;
      appLock.clearExternalActivity();
      const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
      backgroundedAt.current = null;
      if (enabled.current && away >= RELOCK_AFTER_MS) setLocked(true);
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const unlock = useCallback(() => setLocked(false), []);
  return {locked, unlock};
}

export function LockScreen({onUnlock}: {onUnlock: () => void}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [biometric, setBiometric] = useState(false);

  const tryBiometric = useCallback(async () => {
    if (await appLock.authenticateBiometric()) onUnlock();
  }, [onUnlock]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([appLock.isBiometricEnabled(), appLock.biometricAvailable()]).then(
      ([enabled, available]) => {
        if (cancelled || !enabled || !available) return;
        setBiometric(true);
        void tryBiometric();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tryBiometric]);

  const submit = async () => {
    if (!validPin(pin) || checking) return;
    setChecking(true);
    const ok = await appLock.verifyPin(pin);
    setChecking(false);
    if (ok) {
      onUnlock();
      return;
    }
    setPin('');
    setError('That PIN is not right. Try again.');
  };

  return (
    <View
      style={[
        styles.screen,
        {backgroundColor: t.night, paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl},
      ]}>
      <IconLogo size={56} color={t.accent} />
      <Text style={[styles.title, {color: t.onNight}]}>Enter your PIN</Text>
      <Text style={[styles.subtitle, {color: t.onNightMuted}]}>
        Jinnie is locked to keep your finances private.
      </Text>
      <View style={styles.form}>
        <Input
          value={pin}
          onChangeText={next => {
            setPin(next.replace(/\D/g, '').slice(0, PIN_LENGTH.max));
            setError('');
          }}
          placeholder="PIN"
          accessibilityLabel="PIN"
          keyboardType="number-pad"
          secureTextEntry
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        {error ? <Text style={[styles.error, {color: t.negative}]}>{error}</Text> : null}
        <Button disabled={!validPin(pin) || checking} onPress={() => void submit()}>
          Unlock
        </Button>
        {biometric ? (
          <Button variant="secondary" onPress={() => void tryBiometric()}>
            Use fingerprint or face
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, alignItems: 'center', paddingHorizontal: space.xl},
  title: {fontSize: 22, fontWeight: '700', marginTop: space.lg},
  subtitle: {fontSize: 13, marginTop: 4, textAlign: 'center'},
  form: {alignSelf: 'stretch', gap: space.md, marginTop: space.xl},
  error: {fontSize: 12, textAlign: 'center'},
});
