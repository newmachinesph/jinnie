const {withAppBuildGradle, withMainApplication} = require('expo/config-plugins');

/*
 * `expo prebuild` wires the native project to Metro in two places. Re.Pack
 * does the bundling here, not Metro, and Rspack emits `index.bundle`; both
 * need redirecting. android/ is gitignored, so this has to be a plugin, not
 * a hand-edit.
 *
 * 1. MainApplication.kt: jsMainModulePath = ".expo/.virtual-metro-entry".
 *    Without this the dev server 404s on every launch and the app never boots.
 * 2. app/build.gradle: release bundling runs `@expo/cli export:embed`, which
 *    is Metro. Pointing it at the React Native CLI makes it pick up
 *    react-native.config.js, where Re.Pack registers its `bundle` command,
 *    so a release APK is built by the same bundler the dev server uses.
 */
const withRepackBundleEntry = config => {
  config = withMainApplication(config, mod => {
    const {contents} = mod.modResults;
    if (!contents.includes('jsMainModulePath')) {
      mod.modResults.contents = contents.replace(
        'context = applicationContext,',
        'context = applicationContext,\n      jsMainModulePath = "index",',
      );
    }
    return mod;
  });
  return withAppBuildGradle(config, mod => {
    mod.modResults.contents = mod.modResults.contents
      .replace(
        /cliFile = new File\(\["node", "--print", "require\.resolve\('@expo\/cli'.*\n/,
        'cliFile = new File(["node", "--print", "require.resolve(\'react-native/cli.js\')"].execute(null, rootDir).text.trim())\n',
      )
      .replace('bundleCommand = "export:embed"', 'bundleCommand = "bundle"');
    return mod;
  });
};

module.exports = withRepackBundleEntry;
