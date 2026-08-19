/*
 * @duelyst/sdk and @duelyst/common are pnpm workspace members that live IN
 * PLACE at app/sdk and app/common (see MODERNIZATION_PLAN.md step 3.2): the
 * package names resolve through node_modules symlinks to the same directories
 * that the legacy root-absolute requires ('app/sdk/...') resolve to via
 * app-module-path. Node caches modules by realpath, so BOTH import styles
 * must yield the exact same module instances - critical while singletons
 * (GameSession, CONFIG) exist. This test locks that in.
 */
const path = require('path');
require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const Logger = require('app/common/logger');

Logger.enabled = false;

describe('workspace package identity', () => {
  it('expect @duelyst/sdk and app/sdk to be the same module instance', () => {
    /* eslint-disable global-require */
    const byName = require('@duelyst/sdk');
    const byPath = require('app/sdk');
    expect(byName).to.equal(byPath);
    expect(byName.GameSession).to.exist;
  });

  it('expect @duelyst/common subpaths and app/common paths to be the same module instance', () => {
    const byName = require('@duelyst/common/config');
    const byPath = require('app/common/config');
    /* eslint-enable global-require */
    expect(byName).to.equal(byPath);
  });
});
