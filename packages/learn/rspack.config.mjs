import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import {getSharedDependencies} from '@jinnie/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Learn — an independently built, independently deployed container.
 *
 * It owns no native modules. Everything native, plus @jinnie/sdk, is consumed
 * as a Module Federation singleton from the host, so this bundle stays small
 * and learning progress uses the host's existing storage and backup system.
 */
export default Repack.defineRspackConfig(({mode}) => ({
  mode,
  context: __dirname,
  entry: './index.js',
  devServer: {port: 9014},
  resolve: {
    ...Repack.getResolveOptions({enablePackageExports: true}),
    // Compile against the host's copies; do not duplicate them at runtime.
    modules: [path.resolve(__dirname, '../host/node_modules'), 'node_modules'],
  },
  output: {
    uniqueName: 'jinnie-learn',
    // Hashed names in release: the host caches every chunk by URL, so a new
    // build must arrive under a new name or installed copies keep the old one.
    chunkFilename: mode === 'production' ? '[name].[contenthash:8].chunk.bundle' : '[name].chunk.bundle',
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
      ...Repack.getAssetTransformRules({inline: true}),
    ],
  },
  plugins: [
    new Repack.RepackPlugin(),
    new rspack.DefinePlugin({
      __JINNIE_LEARN_URL__: JSON.stringify(process.env.JINNIE_LEARN_URL ?? 'https://learn.jinnie.ph/'),
    }),
    new Repack.plugins.ModuleFederationPluginV2({
      name: 'learn',
      filename: mode === 'production' ? 'learn.container.[contenthash:8].js.bundle' : 'learn.container.js.bundle',
      dts: false,
      exposes: {'./App': './src/App'},
      shared: getSharedDependencies({eager: false}),
    }),
    new rspack.IgnorePlugin({resourceRegExp: /^@react-native-masked-view/}),
  ],
}));
