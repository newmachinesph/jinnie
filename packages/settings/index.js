import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

/*
 * Standalone entry. The host never uses this — it consumes the './App' expose
 * below. It exists so this mini app can be run on its own device build during
 * development, without the shell.
 */
AppRegistry.registerComponent(appName, () => App);
