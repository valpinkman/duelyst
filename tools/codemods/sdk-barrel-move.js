#!/usr/bin/env node
// Codemod (plan step 2.5): app/sdk.coffee moved to app/sdk/index.coffee.
// 1. Rewrites every require of "app/sdk.<coffee-ext>" (any relative depth, or
//    root-absolute) to the extension-less form, which resolves to the new
//    app/sdk/index.coffee via directory resolution in both node and the bundler.
// 2. The barrel no longer exports a network manager (that would put a
//    client-directed edge inside app/sdk); its consumers get
//    a direct require('apps/client/networkManager') instead.
// Run from the repo root. NOTE: the require-insertion half keys on the
// pre-rename `SDK.NetworkManager` form, so it only fires on the first pass
// over a given file (the extension-strip half is idempotent).
const fs = require('fs');
const path = require('path');

const ROOTS = ['app', 'server', 'worker', 'test', 'scripts', 'cli'];
const SKIP = new Set([
  'app/vendor',
  'app/resources',
  'app/original_resources',
  'node_modules',
  'tools/codemods',
]);

function walk(dir) {
  if (SKIP.has(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(js|coffee)$/.test(p) ? [p] : [];
  });
}

let changed = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    // root-absolute 'app/sdk.coffee' -> '@duelyst/sdk' (dir resolution finds index.coffee);
    // relative '../..../app/sdk.coffee' -> '../..../app/sdk/index.coffee' (explicit, so
    // eslint import/extensions keeps enforcing the coffee extension on relative paths)
    let out = src.replace(/(['"])((?:\.\.\/)+app\/)sdk\.coffee(['"])/g, '$1$2sdk/index.coffee$3');
    out = out.replace(/(['"])(?:app\/)?sdk\.coffee(['"])/g, '$1app/sdk$2');
    if (file !== '@duelyst/sdk/index.coffee' && /\bSDK\.NetworkManager\b/.test(out)) {
      out = out.replace(/\bSDK\.NetworkManager\b/g, 'NetworkManager');
      if (file.endsWith('.coffee')) {
        out = out.replace(
          /^(SDK = .*|SDK = require.*)$/m,
          "$&\nNetworkManager = require 'app/networkManager'",
        );
      } else {
        out = out.replace(
          /^((?:const|var|let) SDK = require\('app\/sdk'\);)$/m,
          "$1\nconst NetworkManager = require('apps/client/networkManager');",
        );
      }
    }
    if (out !== src) {
      fs.writeFileSync(file, out);
      changed += 1;
      console.log('rewrote', file);
    }
  }
}
console.log(`${changed} file(s) changed`);
