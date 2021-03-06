const path = require('path');

const logger = require('loggy');
const shell = require('shelljs');

const SETTINGS = require('../lib/settings.js').settings;
const utils = require('../lib/utils.js');

const PATHS = SETTINGS.paths;

function install (options = {}) {
  options = Object.assign({}, {
    platformsSlugs: options.platformsSlugs || [SETTINGS.platform_default],
    forceUpdate: options.forceUpdate,
    url: options.url
  }, options);
  const silent = !options.verbose;
  return utils.requireAdb(options.forceUpdate).then(adb => {
    return options.platformsSlugs.map(platform => {
      // TODO: Check if most recent version of the platform's APK is already installed on the device.
      const dirPlatform = path.resolve(PATHS.downloads, platform);
      const pathApk = shell.find(path.join(dirPlatform, '*.apk'));
      if (!pathApk) {
        throw new Error(`Could not find APK for platform "${platform}"`);
      }

      const devices = shell.exec(`${adb} devices`, {silent});
      if (devices.stdout === 'List of devices attached\n\n') {
        throw new Error('Could not find connected device');
      }

      logger.log(`${options.indent}Ensure that you have enabled Developer Mode` +
        (platform === 'oculusvr' ? ` (https://developer.oculus.com/documentation/mobilesdk/latest/concepts/mobile-device-setup-go/)` : ``));

      setTimeout(() => {
        logger.log(`${options.indent}Put your finger in front of the proximity sensor on your VR headset` +
          (platform === 'oculusvr' ? `; then, press the volume-left (top-left) button to enter Developer Mode` : ``));

        shell.exec(`${adb} uninstall org.mozilla.vrbrowser`, {silent});
        shell.exec(`${adb} install -r ${pathApk}`, {silent});

        if (options.url) {
          shell.exec(`${adb} shell am start -a android.intent.action.VIEW -d "${options.url}" org.mozilla.vrbrowser/.VRBrowserActivity`, {silent});
        } else {
          shell.exec(`${adb} shell am start -n org.mozilla.vrbrowser/.VRBrowserActivity`, {silent});
          logger.log(`${options.indent}Run \`fxr launch http://example.com/\` to launch a site in Firefox Reality`);
        }
      }, 3000);

      return platform;
    });
  });
}

module.exports.run = install;
