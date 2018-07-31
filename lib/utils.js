const path = require('path');

const androidPlatformTools = require('android-platform-tools');
const chalk = require('chalk');
const fs = require('fs-extra');
const logger = require('loggy');
const shell = require('shelljs');

const pkgJson = require('../package.json');
const SETTINGS = require('./settings.js').settings;

const LIBRARY_NAME = pkgJson.libraryName || (pkgJson.bin && Object.keys(pkgJson.bin)[0]);
const PLATFORMS = SETTINGS.platforms;
const PLATFORMS_SLUGS = SETTINGS.platformsSlugs;

const MAX_ATTEMPTS = 10; // Number of times to attempt to connect to the device.
const PATHS = SETTINGS.paths;
const RETRY_DELAY = 3000; // Time to delay between attempts in milliseconds (default: 3 seconds).
const RETRY = true; // Whether to attempt to retry the command.

let adb = path.join(__dirname, '..', 'node_modules', '.bin', 'adbn');
const adbInstalled = !fs.existsSync(__dirname, 'node_modules', 'android-platform-tools', 'platform-tools', 'adb');

const adbFirstTime = SETTINGS.always_redownload_android_platform_tools === true ? true : adbInstalled;

module.exports.parseOrgRepo = (org, repo) => {
  if (org && !repo) {
    const orgRepoChunks = org.split('/').slice(0, 2);
    if (orgRepoChunks.length) {
      [org, repo] = orgRepoChunks;
    }
  }
  return {org, repo};
};

module.exports.requireAdb = (forceUpdateAdb = adbFirstTime) => {
  if (forceUpdateAdb) {
    return androidPlatformTools.downloadAndReturnToolPaths()
      .then(tools => {
        adb = path.resolve('..', tools.adbPath);
        return adb;
      });
  }
  return Promise.resolve(adb);
};

const isTruthy = module.exports.isTruthy = str => {
  if (!str) {
    return false;
  }
  return str === '1' ||
    str === 'true' ||
    str === 'yes' ||
    str === 'y';
};

module.exports.forceAdb = forceStr => {
  return isTruthy(forceStr) || adbFirstTime;
};

module.exports.getArgvPaths = argv => {
  return (argv || [])
    .filter(arg => fs.existsSync(arg))
    .map(arg => path.resolve(arg));
};

const getPlatform = module.exports.getPlatform = str => {
  const strWithPlatformMaybe = (str || '').toLowerCase();
  if (strWithPlatformMaybe) {
    if (strWithPlatformMaybe.includes('oculus') ||
        strWithPlatformMaybe === 'go') {
      return PLATFORMS.oculusvr;
    }
    if (strWithPlatformMaybe.includes('daydream') ||
        strWithPlatformMaybe.includes('pixel') ||
        strWithPlatformMaybe.includes('google')) {
      return PLATFORMS.googlevr;
    }
    if (strWithPlatformMaybe.includes('wave') ||
        strWithPlatformMaybe.includes('htc')) {
      return PLATFORMS.wavevr;
    }
    if (strWithPlatformMaybe.includes('snap')) {
      return PLATFORMS.svr;
    }
    for (let platform of PLATFORMS_SLUGS) {
      if (strWithPlatformMaybe.includes(platform)) {
        return PLATFORMS[platform];
      }
    }
  }
  return null;
};

module.exports.pluralise = (singular, plural, num = 0) => {
  return num === 1 ? singular : plural;
};

module.exports.uppercaseFirstLetter = str => {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.substr(1);
};

module.exports.cleanUrl = str => {
  return (str || '').replace(/^["';&]*/g, '').replace(/["';&]*$/g, '').trim();
};

module.exports.getIndent = (num = 0, spaceChar = '\t') => {
  if (!num || !spaceChar) {
    return '';
  }
  if (spaceChar.repeat) {
    return spaceChar.repeat(num);
  }
  let output = '';
  for (let idx = 0; idx < num.length; idx++) {
    output[idx] += spaceChar;
  }
  return output;
};

module.exports.getArgv = (argv = process.argv) => {
  if (!argv) {
    return [];
  }
  argv = argv.slice(0);
  argv.splice(0, 2);
  return argv;
};

module.exports.loggerPlatform = (platform, str, level = 'log') => {
  const isTip = level === 'tip';
  if (isTip) {
    level = 'warn';
  }
  return logger[level](`${chalk.black.bgCyan(getPlatform(platform).name)} ${isTip ? chalk.bold.black.bgYellow('TIP:') + ' ' : ''}${isTip ? chalk.yellow(str) : str}`);
};

const getDeveloperModeTip = module.exports.getDeveloperModeTip = platform => {
  return `Ensure that you have enabled "Developer Mode"` +
    (platform === 'oculusvr' ?
      ` ${chalk.gray(`(${
          chalk.underline('https://developer.oculus.com/documentation/mobilesdk/latest/concepts/mobile-device-setup-go/')
        })`)}` : '');
};

let timeoutRetry = null;
const reset = () => {
  clearTimeout(timeoutRetry);
  attempts = 0;
};

const ensureDevice = module.exports.ensureDevice = (platform, options = {}, attempts = 0, abort = false) => {
  return new Promise((resolve, reject) => {
    // let timeoutRetry = null;
    // const reset = () => {
    //   clearTimeout(timeoutRetry);
    //   attempts = 0;
    // };

    if (abort) {
      reset();
      return;
    }

    const silent = 'verbose' in options ? !options.verbose : true;
    const loggerPlatform = (str, level) => utils.loggerPlatform(platform, str, level);

    // TODO: Make this DRY, store the platform => APK mapping in an object, and run+cache at the top of this file.
    let downloadsMetadata = null;
    let apkArtifact;
    let apkLocalPath;
    try {
      downloadsMetadata = await fs.readJson(PATHS.downloads_index);
    } catch (err) {
    }
    if (downloadsMetadata) {
      apkArtifact = downloadsMetadata.artifacts.find(p => p.platform && p.platform.slug === platform);
      if (apkArtifact) {
        apkLocalPath = path.resolve(PATHS.downloads, platform, apkArtifact.basename);
      }
    }

    // TODO: Check if the platform's APK is first installed on the device.
    if (!apkLocalPath || !fs.existsSync(apkLocalPath)) {
      // TODO: Run `download` + `install` if needed: https://github.com/MozillaReality/fxr-cli/issues/28
      reject(new Error(`${chalk.bold(pkgJson.productName)} is not installed`));
      loggerPlatform(`First run ${chalk.bold.green.bgBlack(`${LIBRARY_NAME} install`)} to install ${chalk.bold(pkgJson.productName)}`, 'tip');
      return;
    }

    const devices = shell.exec(`${adb} devices`, {silent});
    const DEVICES_LIST_EMPTY = 'List of devices attached\n\n';
    const DEVICE_NOT_FOUND = 'Could not find connected device';
    if (devices.stderr || !devices.stdout || devices.stdout === DEVICES_LIST_EMPTY) {
      if (devices.stdout === DEVICES_LIST_EMPTY) {
        loggerPlatform(utils.getDeveloperModeTip(platform), 'tip');
      }
      loggerPlatform('Put on your VR headset', 'warn');
      if (!RETRY || RETRY_DELAY <= 0) {
        throw new Error(DEVICE_NOT_FOUND);
      }
      timeoutRetry = setTimeout(() => {
        if (attempts >= MAX_ATTEMPTS) {
          reset();
          throw new Error(DEVICE_NOT_FOUND);
        }
        attempts++;
        shell.exec(`${adb} kill-server`, {silent});
        shell.exec(`${adb} start-server`, {silent});
        ensureDevice(platform, options, attempts, abort);
      }, RETRY_DELAY);
    } else {
      reset();
    }
  });
}
