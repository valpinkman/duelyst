/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// Localization Script Helpers

/*
  UtilsLocalization - game session utility methods.
*/

const UtilsLocalization = {};
module.exports = UtilsLocalization;

const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../..'));

const npmRun = require('npm-run');
const ProgressBar = require('progress');

const _ = require('underscore');

const helpers = require('tools/helpers');
const fs = require('fs');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');

UtilsLocalization.PATH_TO_LOCALES = '../../apps/client/localization/locales';

UtilsLocalization.createBlankJsonForKeys = function (keys, defaultTo) {
  const jsonData = {};
  _.each(keys, (key) => {
    const splitKeyVals = key.split('.');
    jsonData[splitKeyVals[0]] = jsonData[splitKeyVals[0]] || {};
    if (
      __guard__(
        defaultTo != null ? defaultTo[splitKeyVals[0]] : undefined,
        (x) => x[splitKeyVals[1]],
      ) != null
    ) {
      return (jsonData[splitKeyVals[0]][splitKeyVals[1]] =
        defaultTo[splitKeyVals[0]][splitKeyVals[1]]);
    }
    return (jsonData[splitKeyVals[0]][splitKeyVals[1]] = '');
  });

  return jsonData;
};

UtilsLocalization.getAllKeysFromLocalizationJsonData = (jsonData) =>
  _.reduce(
    jsonData,
    (memo, val, key) =>
      memo.concat(
        _.reduce(
          val,
          (innerMemo, innerVal, innerKey) => {
            innerMemo.push(`${key}.${innerKey}`);
            return innerMemo;
          },
          [],
        ),
      ),
    [],
  );

UtilsLocalization.readFileToJsonData = (fileName) =>
  new Promise((resolve, reject) => {
    fs.readFile(fileName, (err, contents) => {
      if (err) {
        reject(err);
      }
      return resolve(contents);
    });
  }).then((fileContents) => Promise.resolve(JSON.parse(fileContents)));

UtilsLocalization.writeMissingTranslationFiles = function (
  languageKey,
  englishData,
  translationData,
) {
  const englishKeys = UtilsLocalization.getAllKeysFromLocalizationJsonData(englishData);
  const translationKeys = UtilsLocalization.getAllKeysFromLocalizationJsonData(translationData);

  const missingKeysFromTranslation = _.difference(englishKeys, translationKeys);

  const emptyJsonForMissingTranslationKeys = UtilsLocalization.createBlankJsonForKeys(
    missingKeysFromTranslation,
  );
  const missingTranslationKeysStr = JSON.stringify(emptyJsonForMissingTranslationKeys, null, 2);

  const defaultedJsonForMissingTranslationKeys = UtilsLocalization.createBlankJsonForKeys(
    missingKeysFromTranslation,
    englishData,
  );
  const missingGermanKeysDefaultedStr = JSON.stringify(
    defaultedJsonForMissingTranslationKeys,
    null,
    2,
  );

  return Promise.all([
    helpers.writeFile(
      `./localization_output/missing_${languageKey}_translations_empty.json`,
      missingTranslationKeysStr,
    ),
    helpers.writeFile(
      `./localization_output/missing_${languageKey}_translations_with_english.json`,
      missingGermanKeysDefaultedStr,
    ),
  ]);
};

UtilsLocalization.generateLastUpdatedDataForKeys = function (languageKey, translationKeys) {
  //  return PromiseUtils.map(translationKeys.slice(0,15),(key)->
  const bar = new ProgressBar(
    `processing ${languageKey} [:bar] :current/:total :percent :etas :elapsed`,
    {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: translationKeys.length,
    },
  );
  return PromiseUtils.map(
    translationKeys,
    (key) =>
      UtilsLocalization.getLastUpdatedCommitForTranslation(languageKey, key).then(
        (lastUpdatedCommitMsg) => {
          const splitMsg = lastUpdatedCommitMsg.split(',');
          const lastUpdateData = {
            committed_at: parseInt(splitMsg[0]) * 1000,
            commit_hash: splitMsg[1],
          };
          bar.tick();
          return Promise.resolve([key, lastUpdateData]);
        },
      ),
    { concurrency: 10 },
  ).then((keyValuePairsOfLastUpdates) => {
    //  console.log("here #{JSON.stringify(keyValuePairsOfLastUpdates,null,2)}")
    const lastUpdatedData = _.reduce(
      keyValuePairsOfLastUpdates,
      (memo, pair) => {
        memo[pair[0]] = pair[1];
        return memo;
      },
      {},
    );
    //    console.log("here #{JSON.stringify(lastUpdatedData,null,2)}")
    return Promise.resolve(lastUpdatedData);
  });
};

UtilsLocalization.getLastUpdatedCommitForTranslation = (languageKey, translationKey) =>
  //  git log -G "win_streak_message" --pretty=oneline --max-count=1 ./rank.json
  runCommand(buildLastCommitCommandStrForTranslation(languageKey, translationKey)).then((result) =>
    //    console.log("here last time #{translationKey} was update is: " + result)
    Promise.resolve(result),
  );

UtilsLocalization.getTranslationFromFullKey = (translationData, fullTranslationKey) =>
  translationData[fullTranslationKey.split('.')[0]][fullTranslationKey.split('.')[1]];

// Sub helpers
var runCommand = (commandStr) =>
  new Promise((resolve, reject) => {
    npmRun(commandStr, {}, (err, stdOut, stdErr) => {
      if (err != null) {
        return reject(err);
      }
      return resolve(stdOut);
    });
  });

var buildLastCommitCommandStrForTranslation = function (languageKey, translationKey) {
  const splitTranslationKey = translationKey.split('.');
  const categoryName = splitTranslationKey[0];
  const subTranslationKey = splitTranslationKey[1];
  // TODO: need to perform a regex that will only look within a category
  // See https://git-scm.com/docs/git-log#_pretty_formats for different formats
  if (languageKey === 'en') {
    //    return "git log -G \"#{subTranslationKey}\" --pretty=oneline --max-count=1 #{UtilsLocalization.PATH_TO_LOCALES}/#{languageKey}/#{categoryName}.json"
    return `git log -G \"${subTranslationKey}\" --pretty=format:%at,%H --max-count=1 ${UtilsLocalization.PATH_TO_LOCALES}/${languageKey}/${categoryName}.json`;
  }
  //    return "git log -G \"#{subTranslationKey}\" --pretty=oneline --max-count=1 #{UtilsLocalization.PATH_TO_LOCALES}/#{languageKey}/index.json"
  return `git log -G \"${subTranslationKey}\" --pretty=format:%at,%H --max-count=1 ${UtilsLocalization.PATH_TO_LOCALES}/${languageKey}/index.json`;
};

// end sub helpers

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
