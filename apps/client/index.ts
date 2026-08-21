/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// SPIKE — issue #3, remove with app/ui/components/spike. Pulls the ESM Lit proof
// into the real bundle so `pnpm build` output can be checked in a browser. It
// registers a custom element and renders nothing unless explicitly mounted.
require('app/ui/components/spike/spike-host');

// localization setup
const whenLocalizationReady = require('./localization/index');

whenLocalizationReady.then(() => {
  let app;
  const i18next = require('i18next');
  return (app = require('./application'));
});
