/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// libraries
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../..'));

const npmRun = require('npm-run');

const _ = require('underscore');
const fs = require('fs');

const helpers = require('../helpers');
const UtilsLocalization = require('./utils_localization');

// git log -G "win_streak_message" --pretty=oneline ./rank.json

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
