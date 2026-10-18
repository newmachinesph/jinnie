import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, InlineAlert, Stack, space} from '@jinnie/sdk';

type Props = {
  children: React.ReactNode;
  /** Shown to the user, so name the app, not the component. */
  name: string;
  /**
   * Asked to rebuild the failed subtree. Clearing local state is not enough:
   * a rejected React.lazy stays rejected, so the owner has to hand us a fresh
   * component before a retry can succeed.
   */
  onRetry?: () => void;
};

type State = {error: Error | null};

/**
 * A federated mini app is fetched over the network at runtime, so "this screen
 * did not load" is an ordinary state, not a crash. Each app gets its own
 * boundary: one unreachable dev server or bad bundle must not take the shell
 * down with it.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn(`[jinnie] ${this.props.name} failed to load`, error, info.componentStack);
  }

  render() {
    const {error} = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <Stack gap={space.md}>
          <InlineAlert
            tone="danger"
            title={`${this.props.name} could not be loaded`}
            description={
              __DEV__
                ? `${error.message}\n\nCheck that this app's dev server is running, and that its port is reachable from the device.`
                : 'This app could not be downloaded. Check your connection and try again — your records are unaffected.'
            }
          />
          <Button
            variant="secondary"
            onPress={() => {
              this.setState({error: null});
              this.props.onRetry?.();
            }}>
            Try again
          </Button>
        </Stack>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {paddingVertical: space.lg},
});
