/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// localization setup
const whenLocalizationReady = require('apps/client/localization/index');

whenLocalizationReady.then(() => {
  let register;
  const i18next = require('i18next');
  return (register = require('./register'));
});
