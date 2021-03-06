const path = require('path');

const androidPlatformTools = require('android-platform-tools');
const fs = require('fs-extra');

const SETTINGS = require('./settings.js').settings;

const PLATFORMS = SETTINGS.platforms;
const PLATFORMS_SLUGS = SETTINGS.platformsSlugs;

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

module.exports.requireAdb = (forceUpdate = adbFirstTime) => {
  if (forceUpdate) {
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

module.exports.getPlatform = str => {
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
