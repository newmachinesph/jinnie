const {promises: fs} = require('node:fs');
const path = require('node:path');
const {withAndroidManifest, withDangerousMod} = require('expo/config-plugins');

/*
 * Release builds block cleartext HTTP, as they should. The one exception is
 * `localhost`, which over `adb reverse` is this machine: it lets a release
 * APK load its mini apps from the local CDN server so the release path can be
 * checked on a phone before anything is uploaded. Traffic to localhost never
 * leaves the device. Debug builds keep Expo's allow-all so a LAN IP works.
 */
const MAIN = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
  </domain-config>
</network-security-config>
`;

const DEBUG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

const withLocalhostCleartext = config => {
  config = withAndroidManifest(config, mod => {
    const application = mod.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    async mod => {
      const app = path.join(mod.modRequest.platformProjectRoot, 'app/src');
      for (const [variant, xml] of [['main', MAIN], ['debug', DEBUG]]) {
        const dir = path.join(app, variant, 'res/xml');
        await fs.mkdir(dir, {recursive: true});
        await fs.writeFile(path.join(dir, 'network_security_config.xml'), xml);
      }
      return mod;
    },
  ]);
};

module.exports = withLocalhostCleartext;
