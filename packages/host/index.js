import {ScriptManager} from '@callstack/repack/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppRegistry} from 'react-native';
import App from './src/App';

// In release builds, cache downloaded mini-app bundles so a cold start after
// the first launch does not need the network.
if (!__DEV__) {
  ScriptManager.shared.setStorage(AsyncStorage);
}

// 'main' is what `expo prebuild` writes into MainActivity.getMainComponentName().
// Changing it here without changing the native project gives a blank screen.
AppRegistry.registerComponent('main', () => App);
