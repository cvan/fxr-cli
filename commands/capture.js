const child_process = require('child_process');
const path = require('path');

const chalk = require('chalk');
const fs = require('fs-extra');
const shell = require('shelljs');

const pkgJson = require('../package.json');
const SETTINGS = require('../lib/settings.js').settings;
const utils = require('../lib/utils.js');

const LIBRARY_NAME = pkgJson.libraryName || (pkgJson.bin && Object.keys(pkgJson.bin)[0]);
const MAX_ATTEMPTS = 10; // Number of times to attempt to connect to the device.
const PATHS = SETTINGS.paths;

function capture (options = {}) {
  options = Object.assign({}, {
    platformsSlugs: options.platformsSlugs || [SETTINGS.platform_default],
    forceUpdate: options.forceUpdate,
    forceUpdateAdb: options.forceUpdateAdb,
    url: options.url,
    verbose: options.verbose
  }, options);

  const silent = !options.verbose;

  return new Promise(async (resolve, reject) => {
    const adb = await utils.requireAdb(options.forceUpdateAdb);

    const platform = options.platformsSlugs[0];
    const loggerPlatform = (str, level) => utils.loggerPlatform(platform, str, level);

    function main () {
      let cmd;
      if (options.url) {
        cmd = shell.exec(`${adb} shell am start -a android.intent.action.VIEW -d "${options.url}" org.mozilla.vrbrowser/org.mozilla.vrbrowser.VRBrowserActivity`, {silent});
      } else {
        cmd = shell.exec(`${adb} shell am start -a android.intent.action.VIEW org.mozilla.vrbrowser/org.mozilla.vrbrowser.VRBrowserActivity`, {silent});
      }

      let errMsg;
      let launchedObjStr = options.url ? chalk.bold.underline(options.url) : chalk.bold(pkgJson.productName);
      if (cmd.stderr && cmd.stderr.startsWith('Error')) {
        errMsg = `Could not launch ${launchedObjStr}`;
        loggerPlatform(errMsg, 'error');
        throw new Error(errMsg);
      } else {
        loggerPlatform(`Launched ${launchedObjStr}`, 'success');
        return {
          url: options.url,
          platform
        };
      }
    }

    return utils.prepareDevice(platform, options).then(main, () => {
      loggerPlatform('error occurred', 'fail');
    });
  });
}

module.exports.run = capture;
