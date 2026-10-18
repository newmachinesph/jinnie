import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

/*
 * Development bundle entry. The host consumes './App' through federation
 * and supplies the storage and navigation bridge required by Learn.
 */
AppRegistry.registerComponent(appName, () => App);
