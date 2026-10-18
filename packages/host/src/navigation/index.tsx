import {useCallback} from 'react';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useNavigation, type NavigationProp} from '@react-navigation/native';
import {useTheme} from '@jinnie/sdk';
import {TabBar} from '../components/TabBar';
import {HomeScreen} from '../screens/HomeScreen';
import {LauncherScreen} from '../screens/LauncherScreen';
import {MiniApp} from '../screens/MiniAppScreen';

export type RootStackParamList = {
  Tabs: undefined;
  MiniApp: {appId: string};
};

export type TabsParamList = {
  Home: undefined;
  Wallet: undefined;
  Apps: undefined;
  Accounts: undefined;
  Bills: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();

/** Open any mini app as a pushed screen, from anywhere in the shell. */
function useOpenApp() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  return useCallback(
    (appId: string) => navigation.navigate('MiniApp', {appId}),
    [navigation],
  );
}

function HomeTab() {
  return <HomeScreen onOpenApp={useOpenApp()} />;
}

function AppsTab() {
  return <LauncherScreen onOpenApp={useOpenApp()} />;
}

/**
 * `host.close()` means "return to the launcher". A tab has nothing to pop, so
 * it switches to the Apps tab — sending it back to `MiniApp` would push a
 * second copy of the app that just asked to be closed.
 */
function useGoToLauncher() {
  const navigation = useNavigation<NavigationProp<TabsParamList>>();
  return useCallback(() => navigation.navigate('Apps'), [navigation]);
}

/**
 * The three apps that earn a permanent tab are still ordinary federated mini
 * apps — the tab just mounts one without the back affordance.
 */
function WalletTab() {
  return <MiniApp appId="wallet" showBack={false} onClose={useGoToLauncher()} onOpenApp={useOpenApp()} />;
}

function AccountsTab() {
  return <MiniApp appId="accounts" showBack={false} onClose={useGoToLauncher()} onOpenApp={useOpenApp()} />;
}

function BillsTab() {
  return <MiniApp appId="bills" showBack={false} onClose={useGoToLauncher()} onOpenApp={useOpenApp()} />;
}

function TabsNavigator() {
  return (
    <Tabs.Navigator
      tabBar={props => <TabBar {...props} />}
      screenOptions={{headerShown: false}}>
      <Tabs.Screen name="Home" component={HomeTab} options={{title: 'Home'}} />
      <Tabs.Screen name="Wallet" component={WalletTab} options={{title: 'Wallet'}} />
      <Tabs.Screen name="Apps" component={AppsTab} options={{title: 'Apps'}} />
      <Tabs.Screen name="Accounts" component={AccountsTab} options={{title: 'Accounts'}} />
      <Tabs.Screen name="Bills" component={BillsTab} options={{title: 'Bills'}} />
    </Tabs.Navigator>
  );
}

function MiniAppRoute({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'MiniApp'>) {
  // Stable: the bridge object is memoised on this identity, so a fresh arrow
  // each render would rebuild it and re-render the whole mini app.
  const close = useCallback(() => navigation.goBack(), [navigation]);
  const open = useCallback((appId: string) => navigation.push('MiniApp', {appId}), [navigation]);
  return <MiniApp appId={route.params.appId} onClose={close} onOpenApp={open} />;
}

export function RootNavigator() {
  const t = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: t.surface},
      }}>
      <Stack.Screen name="Tabs" component={TabsNavigator} />
      <Stack.Screen name="MiniApp" component={MiniAppRoute} />
    </Stack.Navigator>
  );
}
