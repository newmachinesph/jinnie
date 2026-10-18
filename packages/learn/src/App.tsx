import {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, AppState, BackHandler, Linking, StyleSheet, Text, View} from 'react-native';
import {WebView, type WebViewMessageEvent} from 'react-native-webview';
import {File, Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {useIsFocused} from '@react-navigation/native';
import {appLock, Button, IconLogo, Progress, space, useHost, useTheme, withAlpha} from '@jinnie/sdk';
import {courseUrl, externalUrl, isCourseUrl, isTrustedMessageUrl, LEARN_APPS, parseLearnRequest, responseScript, validateFile, validateState} from './protocol';
import {navigationScript, scrollScript, visibilityScript} from './browser';

declare const __JINNIE_LEARN_URL__: string;
const ENTRY = courseUrl(__JINNIE_LEARN_URL__);
const PROGRESS_KEY = 'progress.v1';
const LOAD_TIMEOUT_MS = 30000;
const OBSERVE_NAVIGATION = navigationScript() + scrollScript();
const RESET_SCROLL = 'window.__jinnieLearnScrollReset&&window.__jinnieLearnScrollReset();true;';

type ScrollDirection = (direction: 'up' | 'down', atTop: boolean) => void;

export default function LearnApp({onBackHandler, onScroll}: {
  onBackHandler?: (handler: (() => boolean) | null) => void;
  /** Course scroll direction, so the host can collapse its header while reading. */
  onScroll?: ScrollDirection;
} = {}) {
  const host = useHost();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const web = useRef<WebView>(null);
  const currentDocument = useRef(ENTRY);
  const resumeUrl = useRef(ENTRY);
  const documentVersion = useRef(0);
  const browserHistory = useRef(false);
  const routeHistory = useRef(false);
  const mounted = useRef(true);
  const queue = useRef(Promise.resolve());
  const [attempt, setAttempt] = useState(0);
  const [sourceUrl, setSourceUrl] = useState(ENTRY);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => setActive(next === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    web.current?.injectJavaScript(visibilityScript(!isFocused || !active));
  }, [isFocused, active]);
  useEffect(() => {
    if (!loading || !isFocused || !active) return;
    const timeout = setTimeout(() => {
      documentVersion.current += 1;
      setLoading(false);
      setError('Learn could not load. Connect to the internet and try again. Your saved progress is safe.');
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [loading, isFocused, active, attempt]);

  const goBack = useCallback(() => {
    if (!isFocused || error || !web.current || !(browserHistory.current || routeHistory.current)) return false;
    web.current.goBack();
    return true;
  }, [isFocused, error]);
  useEffect(() => {
    onBackHandler?.(goBack);
    return () => onBackHandler?.(null);
  }, [goBack, onBackHandler]);
  useEffect(() => {
    if (!isFocused) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => subscription.remove();
  }, [goBack, isFocused]);

  const openExternal = useCallback(async (url: string) => {
    const safe = externalUrl(url);
    if (!safe) return;
    try {
      appLock.expectExternalActivity();
      await Linking.openURL(safe);
    } catch {
      // The lesson remains available if the device has no app for this link.
    }
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    if (!isTrustedMessageUrl(event.nativeEvent.url, ENTRY, currentDocument.current)) return;
    const request = parseLearnRequest(event.nativeEvent.data);
    if (!request) return;
    if (request.type === 'navigation') {
      const url = request.payload?.url;
      if (typeof url === 'string' && isCourseUrl(url, ENTRY) && typeof request.payload?.canGoBack === 'boolean') {
        currentDocument.current = url;
        resumeUrl.current = courseUrl(url);
        routeHistory.current = request.payload.canGoBack;
      }
      // A new route starts at the top: bring the header back and restart direction tracking.
      onScroll?.('up', true);
      web.current?.injectJavaScript(RESET_SCROLL);
      return;
    }
    if (request.type === 'scroll') {
      const {direction, atTop} = request.payload ?? {};
      if ((direction === 'up' || direction === 'down') && typeof atTop === 'boolean') onScroll?.(direction, atTop);
      return;
    }
    const acceptedVersion = documentVersion.current;
    const canReply = () => mounted.current && acceptedVersion === documentVersion.current &&
      isCourseUrl(currentDocument.current, ENTRY);
    // Preserve save ordering, including the ready request on a reload.
    queue.current = queue.current.then(async () => {
      // A final accepted save still completes when the user leaves Learn.
      if ((!mounted.current || !canReply()) && request.type !== 'saveState') return;
      let value: unknown = null;
      let navigate: string | undefined;
      try {
        if (request.type === 'ready') {
          value = await host.storage.get(PROGRESS_KEY);
        } else if (request.type === 'saveState') {
          const state = validateState(request.payload?.state);
          await host.storage.set(PROGRESS_KEY, state);
          if (await host.storage.get(PROGRESS_KEY) !== state) throw new Error('Progress could not be saved. Please try again.');
          value = true;
        } else if (request.type === 'openApp') {
          const app = request.payload?.app;
          if (typeof app !== 'string' || !(LEARN_APPS as readonly string[]).includes(app) || !host.openApp) {
            throw new Error('That Jinnie app is not available.');
          }
          navigate = app;
          value = true;
        } else if (request.type === 'saveFile') {
          const exportFile = validateFile(request.payload);
          if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
          const file = new File(Paths.cache, `learn-${Date.now()}-${exportFile.name}`);
          file.create();
          file.write(exportFile.base64, {encoding: 'base64'});
          try {
            appLock.expectExternalActivity();
            await Sharing.shareAsync(file.uri, {
              mimeType: exportFile.mime,
              UTI: exportFile.mime === 'application/json' ? 'public.json' : 'public.svg-image',
              dialogTitle: 'Save from Jinnie Learn',
            });
            value = true;
          } finally {
            if (file.exists) file.delete();
          }
        }
        if (navigate && canReply() && !host.openApp?.(navigate)) throw new Error('That Jinnie app is not available.');
        if (canReply()) web.current?.injectJavaScript(responseScript(request.id, true, value));
      } catch (failure) {
        if (canReply()) web.current?.injectJavaScript(responseScript(request.id, false, null,
          failure instanceof Error ? failure.message : 'The request could not be completed.'));
      }
    });
  }, [host, onScroll]);

  const retry = () => {
    documentVersion.current += 1;
    browserHistory.current = false;
    routeHistory.current = false;
    currentDocument.current = resumeUrl.current;
    setSourceUrl(resumeUrl.current);
    setError('');
    setLoading(true);
    setProgress(0);
    setAttempt(current => current + 1);
  };
  const fail = (message: string) => {
    documentVersion.current += 1;
    setLoading(false);
    setError(message);
  };

  return (
    <View style={[styles.root, {backgroundColor: theme.surface}]}>
      {!error ? (
        <WebView<{}>
          key={attempt}
          ref={web}
          source={{uri: sourceUrl}}
          style={styles.root}
          containerStyle={{backgroundColor: theme.surface}}
          originWhitelist={['*']}
          onMessage={onMessage}
          injectedJavaScriptBeforeContentLoaded={OBSERVE_NAVIGATION + visibilityScript(!isFocused || !active)}
          injectedJavaScript={OBSERVE_NAVIGATION + visibilityScript(!isFocused || !active)}
          onShouldStartLoadWithRequest={request => {
            if (isCourseUrl(request.url, ENTRY)) return true;
            if (request.isTopFrame !== false) void openExternal(request.url);
            return false;
          }}
          onOpenWindow={event => { void openExternal(event.nativeEvent.targetUrl); }}
          onLoadStart={event => {
            // Android reports SPA history updates here too, with the page already at
            // 100%; those never get a matching load end, so only a real load may wait.
            if (!event.nativeEvent.loading) return;
            documentVersion.current += 1;
            currentDocument.current = event.nativeEvent.url;
            setProgress(0);
            setLoading(true);
          }}
          onNavigationStateChange={event => {
            currentDocument.current = event.url;
            browserHistory.current = event.canGoBack;
            if (isCourseUrl(event.url, ENTRY)) resumeUrl.current = courseUrl(event.url);
          }}
          onLoadProgress={event => setProgress(event.nativeEvent.progress * 100)}
          onLoadEnd={() => {
            setLoading(false);
            onScroll?.('up', true);
            web.current?.injectJavaScript(OBSERVE_NAVIGATION + visibilityScript(!isFocused || !active));
          }}
          onError={() => fail('Learn could not load. Connect to the internet and try again. Your saved progress is safe.')}
          onHttpError={event => {
            if (isCourseUrl(event.nativeEvent.url, ENTRY)) {
              fail('Learn is temporarily unavailable. Please try again.');
            }
          }}
          onRenderProcessGone={() => fail('Learn is temporarily unavailable. Please try again.')}
          onContentProcessDidTerminate={() => fail('Learn is temporarily unavailable. Please try again.')}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          mixedContentMode="never"
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          setSupportMultipleWindows
          webviewDebuggingEnabled={__DEV__}
          allowsBackForwardNavigationGestures
          showsHorizontalScrollIndicator={false}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
        />
      ) : (
        <View style={styles.feedback} accessibilityLiveRegion="polite">
          <View style={[styles.brandTile, {backgroundColor: withAlpha(theme.primary, 0.09), borderColor: withAlpha(theme.accent, 0.35)}]}>
            <IconLogo size={52} color={theme.primary} />
          </View>
          <Text style={[styles.title, {color: theme.ink}]} accessibilityRole="header">Learn</Text>
          <Text style={[styles.message, {color: theme.ink}]}>{error}</Text>
          <Button onPress={retry}>Try again</Button>
        </View>
      )}
      {loading && !error ? (
        <View style={[styles.loading, {backgroundColor: theme.surface}]} accessibilityLabel="Loading Jinnie Learn" accessibilityRole="progressbar" accessibilityValue={{min: 0, max: 100, now: Math.round(progress)}}>
          <View style={[styles.brandTile, {backgroundColor: withAlpha(theme.primary, 0.09), borderColor: withAlpha(theme.accent, 0.35)}]}>
            <IconLogo size={52} color={theme.primary} />
          </View>
          <Text style={[styles.title, {color: theme.ink}]}>Learn</Text>
          <View style={styles.loadingStatus}>
            <ActivityIndicator color={theme.primary} size="small" />
            <Text style={{color: theme.muted}}>Loading Learn...</Text>
          </View>
          <Progress value={progress} color={theme.accent} trackColor={theme.line} style={styles.progress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  feedback: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg},
  brandTile: {width: 104, height: 104, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 26, fontWeight: '700', letterSpacing: -0.6},
  message: {maxWidth: 320, fontSize: 15, lineHeight: 23, textAlign: 'center'},
  loading: {position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl},
  loadingStatus: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  progress: {width: 160, height: 3, borderRadius: 2},
});
