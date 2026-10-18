import {useCallback, useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  type Theme,
} from '@react-navigation/native';
import * as SplashScreenModule from 'expo-splash-screen';
import {
  restoreDemoDataIfLoaded,
  useIsDark,
  useStoresHydrated,
  useTheme,
} from '@jinnie/sdk';
import {RootNavigator} from './navigation';
import {
  OnboardingCarousel,
  SplashScreen,
  markOnboardingComplete,
  useOnboardingNeeded,
} from './components/LaunchExperience';
import {LockScreen, useAppLock} from './components/AppLock';
import {loadApps} from './registry';
import {RestoreBackup} from './components/RestoreBackup';

// The native splash stays up until the first frame is ready to draw.
void SplashScreenModule.preventAutoHideAsync();

function navigationTheme(base: Theme, colors: ReturnType<typeof useTheme>): Theme {
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.surface,
      card: colors.card,
      text: colors.ink,
      border: colors.line,
    },
  };
}

function Shell() {
  const t = useTheme();
  const isDark = useIsDark();
  const hydrated = useStoresHydrated();
  const onboardingNeeded = useOnboardingNeeded();
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const {locked, unlock} = useAppLock();
  const [appsReady, setAppsReady] = useState(false);

  // The tabs mount Wallet, Accounts, and Bills straight away, so their
  // containers must be registered before the first frame.
  useEffect(() => {
    void loadApps().then(() => setAppsReady(true));
  }, []);

  // The sample profile is layered back on after storage is read, so a reset
  // returns the same rows rather than a half-populated app.
  useEffect(() => {
    if (hydrated) void restoreDemoDataIfLoaded();
  }, [hydrated]);

  const ready = hydrated && appsReady && onboardingNeeded !== undefined && locked !== undefined;

  useEffect(() => {
    if (ready) void SplashScreenModule.hideAsync();
  }, [ready]);

  const finishOnboarding = useCallback(() => {
    setOnboardingDone(true);
    void markOnboardingComplete();
  }, []);

  if (!ready) return <SplashScreen />;
  // The lock replaces the tree rather than covering it, so nothing private
  // is rendered underneath while the PIN is being asked for.
  if (locked) return <LockScreen onUnlock={unlock} />;

  const showOnboarding = onboardingNeeded && !onboardingDone;

  return (
    <NavigationContainer
      theme={navigationTheme(isDark ? DarkTheme : DefaultTheme, t)}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <RootNavigator />
      {showOnboarding && !restoring ? (
        <OnboardingCarousel onDone={finishOnboarding} onRestore={() => setRestoring(true)} />
      ) : null}
      {restoring ? (
        <RestoreBackup onClose={() => setRestoring(false)} onRestored={finishOnboarding} />
      ) : null}
    </NavigationContainer>
  );
}

/*
 * No GestureHandlerRootView: nothing here uses gestures. Overlays are RN
 * Modals, rows are Pressables, and neither native-stack nor bottom-tabs lists
 * react-native-gesture-handler as a peer. Adding it back means adding a native
 * dependency to the host and to the shared singleton map.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}
