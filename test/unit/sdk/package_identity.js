/*
 * @duelyst/sdk and @duelyst/common are pnpm workspace members at packages/sdk
 * and packages/common. Each is reachable by TWO spellings: the package name,
 * resolved through the node_modules symlink, and the root-absolute path,
 * resolved by app-module-path. Node caches modules by realpath, so both must
 * yield the exact same instance -- critical while singletons (GameSession,
 * CONFIG) exist, because a second copy means a second GameSession.
 *
 * Production adds a third path to the same module: build-server.mjs writes
 * build/node_modules/@duelyst/* so the package name reaches the transpiled
 * tree instead of the .ts source. That is the same realpath rule, one
 * directory over.
 *
 * NOTE: assert the two spellings against each other. An earlier version of
 * this file was rewritten by a specifier codemod into `require(X)` vs
 * `require(X)` -- comparing a module to itself, which passes for free. If both
 * arguments here are ever the same string, the test has stopped testing.
 */
const path = require('path');

require('app-module-path').addPath(path.join(__dirname, '../../../'));
const { expect } = require('chai');
const Logger = require('@duelyst/common/logger');

Logger.enabled = false;

describe('workspace package identity', () => {
  it('expect @duelyst/sdk and packages/sdk to be the same module instance', () => {
    /* eslint-disable global-require */
    const byName = require('@duelyst/sdk');
    const byPath = require('packages/sdk');
    expect(byName).to.equal(byPath);
    expect(byName.GameSession).to.exist;
  });

  it('expect @duelyst/common subpaths and packages/common paths to be the same module instance', () => {
    const byName = require('@duelyst/common/config');
    const byPath = require('packages/common/config');
    /* eslint-enable global-require */
    expect(byName).to.equal(byPath);
  });
});
