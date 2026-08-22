'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Shared boot sequence for every service entrypoint (api, game,
 * single_player, worker, worker-ui), which were five near-identical files.
 *
 * The one thing that differs between environments is whether TypeScript needs
 * compiling at require time. That is *detected* rather than flagged: running
 * from source means `.ts` on disk, while the ahead-of-time tree under build/
 * is all JavaScript. An env var would be one more thing to get wrong on a
 * deploy, and getting it wrong the quiet way -- forgetting to set it -- would
 * silently put the require hook back in production.
 */
module.exports = function bootstrap(winstonLabel) {
  const root = path.join(__dirname, '..');
  const runningFromSource = fs.existsSync(path.join(root, 'apps', 'server', 'api.ts'));

  if (runningFromSource) {
    // lets require() resolve and compile .ts
    require('tsx/cjs');
  } else {
    // tsx enables source-map support for us; the built tree has to ask
    process.setSourceMapsEnabled(true);
  }

  // still needed for the last root-absolute requires: config/config and version
  // Named packages (@duelyst/sdk) do NOT come through here -- they resolve via
  // node_modules, which is why build-server.mjs writes build/node_modules.
  require('app-module-path').addPath(root);

  // Load config first so it has chance to synchronously validate .json config
  // files *before* any other code executes
  const config = require('config/config');
  // Monkey-patches console.log to Winston/Papertrail
  if (config.get('winston')) {
    require('@duelyst/server/winston').setup(winstonLabel);
  }

  return config;
};
