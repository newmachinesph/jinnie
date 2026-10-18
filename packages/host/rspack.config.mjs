import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Repack from '@callstack/repack';
import {ExpoModulesPlugin} from '@callstack/repack-plugin-expo-modules';
import rspack from '@rspack/core';
import {getSharedDependencies} from '@jinnie/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The one origin everything remote comes from: `apps.json` and, under
 * `/<app>/<platform>/`, each mini app's container. The host compiles in no
 * remote; it reads the manifest on launch and fills `{origin}` with this.
 * Dev builds default to the local CDN server (`pnpm --filter @jinnie/host cdn`),
 * reachable from a device once `reverse` has mapped port 9020; release builds
 * default to the public CDN. JINNIE_CDN overrides either, e.g. a LAN IP for a
 * device on Wi-Fi alone or a staging origin for a release check.
 */
const cdnFor = mode =>
  process.env.JINNIE_CDN ?? (mode === 'production' ? 'https://sdk.jinnie.ph' : 'http://localhost:9020');

export default Repack.defineRspackConfig(({mode, platform}) => ({
  mode,
  context: __dirname,
  entry: './index.js',
  resolve: {
    ...Repack.getResolveOptions({enablePackageExports: true}),
    // The host owns every native dependency. Exposing its node_modules as an
    // absolute resolution root lets shared-module fallbacks requested from the
    // sibling SDK package resolve here instead of walking up from packages/sdk.
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
  },
  output: {
    uniqueName: 'jinnie-host',
  },
  module: {
    rules: [
      {
        test: /\.[cm]?[jt]sx?$/,
        use: {
          loader: '@callstack/repack/babel-swc-loader',
          parallel: true,
          options: {},
        },
        type: 'javascript/auto',
      },
      ...Repack.getAssetTransformRules(),
    ],
  },
  plugins: [
    new Repack.RepackPlugin(),
    // Lets the Expo Modules API (expo-file-system, expo-sharing, and the rest)
    // resolve under Re.Pack instead of Expo's own Metro pipeline.
    new ExpoModulesPlugin(),
    new Repack.plugins.ModuleFederationPluginV2({
      name: 'host',
      dts: false,
      shared: getSharedDependencies({eager: true}),
    }),
    new rspack.DefinePlugin({
      __JINNIE_CDN__: JSON.stringify(cdnFor(mode)),
    }),
    // Optionally required by @react-navigation/elements; not installed here.
    new rspack.IgnorePlugin({resourceRegExp: /^@react-native-masked-view/}),
  ],
}));
