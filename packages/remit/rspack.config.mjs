import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as Repack from '@callstack/repack';
import rspack from '@rspack/core';
import {getSharedDependencies} from '@jinnie/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Remit — an independently built, independently deployed container.
 *
 * It owns no native modules. Everything native, plus @jinnie/sdk, is consumed
 * as a Module Federation singleton from the host, so this bundle stays small
 * and there is only ever one Wallet ledger in the process.
 */
export default Repack.defineRspackConfig(({mode}) => ({
  mode,
  context: __dirname,
  entry: './index.js',
  devServer: {port: 9010},
  resolve: {
    ...Repack.getResolveOptions({enablePackageExports: true}),
    // Compile against the host's copies; do not duplicate them at runtime.
    modules: [path.resolve(__dirname, '../host/node_modules'), 'node_modules'],
  },
  output: {
    uniqueName: 'jinnie-remit',
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
    new Repack.plugins.ModuleFederationPluginV2({
      name: 'remit',
      filename: mode === 'production' ? 'remit.container.[contenthash:8].js.bundle' : 'remit.container.js.bundle',
      dts: false,
      exposes: {'./App': './src/App'},
      shared: getSharedDependencies({eager: false}),
    }),
    new rspack.IgnorePlugin({resourceRegExp: /^@react-native-masked-view/}),
  ],
}));
