/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// libraries

const { exec } = require('child_process');

// the helpers reach into @duelyst/common, which is TypeScript on disk;
// let require() compile it, the same way tools/generate_packages.js does
require('tsx/cjs');
const _ = require('underscore');
const moment = require('moment');
const fs = require('fs');

const helpers = require('../helpers');
const UtilsLocalization = require('./utils_localization');

const runCommand = (commandStr) =>
  new Promise((resolve, reject) => {
    exec(commandStr, {}, (err, stdOut, stdErr) => {
      if (err != null) {
        return reject(err);
      }
      return resolve(stdOut);
    });
  });

Promise.resolve()
  .then(() =>
    Promise.all([
      UtilsLocalization.readFileToJsonData(`${UtilsLocalization.PATH_TO_LOCALES}/en/index.json`),
      // UtilsLocalization.readFileToJsonData(UtilsLocalization.PATH_TO_LOCALES + "/de/index.json")
    ]),
  )
  .then(() => {
    console.log('Complete.');
    return process.exit(1);
  });
