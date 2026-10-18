import {Suspense, lazy, useCallback, useMemo, useRef, useState, type ComponentType} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  AppBar,
  EmptyState,
  HostProvider,
  IconButton,
  IconChevronLeft,
  IconGrid,
  IconLogo,
  getIcon,
  PrivacyToggle,
  Skeleton,
  Stack,
  radius,
  space,
  toneColors,
  useIsDark,
  useTheme,
} from '@jinnie/sdk';
import {getApp} from '@jinnie/sdk';
import {getRemote} from '../registry';
import {ErrorBoundary} from '../components/ErrorBoundary';

function LoadingApp() {
  return (
    <Stack gap={space.md}>
      <Skeleton style={styles.skeletonStat} />
      <Skeleton style={styles.skeletonBlock} />
      <Skeleton style={styles.skeletonBlock} />
    </Stack>
  );
}

type ScrollDirection = (direction: 'up' | 'down', atTop: boolean) => void;

/*
 * The bar slides up out of a clipping wrapper while the user reads down and
 * comes back on the first scroll up; the negative margin lets the content
 * follow it. Margin and transform are layout props, so the animation runs on
 * the JS thread.
 */
function useCollapsingHeader() {
  const offset = useRef(new Animated.Value(0)).current;
  const height = useRef(0);
  const hidden = useRef(false);
  const lastY = useRef(0);
  const reveal = useCallback(
    (show: boolean) => {
      if (hidden.current !== show) return;
      hidden.current = !show;
      Animated.timing(offset, {
        toValue: show ? 0 : -height.current,
        duration: 180,
        useNativeDriver: false,
      }).start();
    },
    [offset],
  );
  const onDirection = useCallback<ScrollDirection>((direction, atTop) => reveal(atTop || direction === 'up'), [reveal]);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
      const y = contentOffset.y;
      const delta = y - lastY.current;
      lastY.current = y;
      // Hiding the bar makes the viewport taller. Only hide while at least that
      // much content is still below; otherwise the clamped offset jumps back
      // and pulls the bar straight back in.
      if (y <= 0 || delta <= -6) reveal(true);
      else if (delta >= 6 && contentSize.height - layoutMeasurement.height - y >= height.current) reveal(false);
    },
    [reveal],
  );
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    height.current = event.nativeEvent.layout.height;
  }, []);
  return {style: {transform: [{translateY: offset}], marginBottom: offset}, onLayout, onScroll, onDirection};
}

export function MiniApp({
  appId,
  onClose,
  onOpenApp,
  showBack = true,
}: {
  appId: string;
  onClose: () => void;
  onOpenApp?: (appId: string) => void;
  showBack?: boolean;
}) {
  const t = useTheme();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const header = useCollapsingHeader();
  const manifest = getApp(appId);

  /*
   * React.lazy memoises whatever its loader settles to — including a
   * rejection. A remote that fails once stays failed for the lifetime of that
   * lazy component, so retrying has to build a new one. Bumping `attempt` is
   * what makes the error boundary's retry actually re-request the bundle.
   *
   * Re-importing an already-loaded remote is cheap: Module Federation returns
   * the cached container rather than fetching again.
   */
  const [attempt, setAttempt] = useState(0);
  const learnBack = useRef<(() => boolean) | null>(null);
  const registerLearnBack = useCallback((handler: (() => boolean) | null) => { learnBack.current = handler; }, []);
  const App = useMemo(() => {
    const remote = getRemote(appId);
    return remote ? lazy(remote) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `attempt` is the retry trigger
  }, [appId, attempt]);

  const identity = useMemo(
    () =>
      manifest
        ? {id: manifest.id, name: manifest.name, version: manifest.version}
        : null,
    [manifest],
  );

  if (!manifest || !App || !identity) {
    return (
      <View style={[styles.screen, {backgroundColor: t.surface}]}>
        <ScrollView contentContainerStyle={[styles.content, {paddingTop: insets.top + space.lg}]}>
          <EmptyState
            icon={<IconGrid size={20} color={t.primary} />}
            title={`No app named “${appId}”`}
            description="It may not have been published to this build yet."
          />
        </ScrollView>
      </View>
    );
  }

  const Icon = getIcon(manifest.icon);
  const tone = toneColors(manifest.tone, isDark);
  const Learn = App as ComponentType<{onBackHandler?: (handler: (() => boolean) | null) => void; onScroll?: ScrollDirection}>;

  // Remounted on retry so the boundary drops the failed subtree.
  const content = (
    <ErrorBoundary
      key={attempt}
      name={manifest.name}
      onRetry={() => setAttempt(current => current + 1)}>
      <Suspense fallback={<LoadingApp />}>
        <HostProvider app={identity} kind={manifest.kind} grants={manifest.grants} onClose={onClose} onOpenApp={onOpenApp}>
          {appId === 'learn' ? <Learn onBackHandler={registerLearnBack} onScroll={header.onDirection} /> : <App />}
        </HostProvider>
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <View style={[styles.screen, {backgroundColor: t.surface}, appId === 'learn' ? {paddingBottom: insets.bottom} : null]}>
      {/* Edge-to-edge turns adjustResize off, so the screen makes room for the
          keyboard itself. It wraps the bar too: the view measures its overlap
          from its own top, so it has to start at the top of the screen. */}
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        {/* The status bar is translucent, so this strip owns the top inset and
            stays put while the bar inside the clipping wrapper collapses. */}
        <View style={[styles.strip, {paddingTop: insets.top, backgroundColor: t.card, borderBottomColor: t.line}]}>
          <View style={styles.clip}>
            <Animated.View onLayout={header.onLayout} style={[styles.bar, header.style]}>
              <AppBar
                leading={
                  <View style={styles.leading}>
                    {showBack ? (
                      <IconButton
                        label={appId === 'learn' ? 'Back' : 'Back to launcher'}
                        icon={<IconChevronLeft size={18} color={t.muted} />}
                        onPress={() => { if (appId !== 'learn' || !learnBack.current?.()) onClose(); }}
                      />
                    ) : null}
                    <View style={[styles.appMark, {backgroundColor: tone.bg}]}>
                      {appId === 'learn' ? <IconLogo size={24} color={tone.fg} /> : <Icon size={18} color={tone.fg} />}
                    </View>
                  </View>
                }
                title={manifest.name}
                subtitle={appId === 'learn' ? manifest.author : `${manifest.author} · v${manifest.version}`}
                trailing={appId === 'learn' ? undefined : <PrivacyToggle />}
              />
            </Animated.View>
          </View>
        </View>

        {appId === 'learn' ? (
          content
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={header.onScroll}
            scrollEventThrottle={16}>
            {content}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1},
  strip: {borderBottomWidth: StyleSheet.hairlineWidth},
  clip: {overflow: 'hidden'},
  bar: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  leading: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  appMark: {
    width: 38,
    height: 38,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {padding: space.lg, paddingBottom: 40, gap: space.lg},
  skeletonStat: {height: 68},
  skeletonBlock: {height: 150},
});
