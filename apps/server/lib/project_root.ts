const fs = require('fs');
const path = require('path');

/*
 * Absolute path to the repository root.
 *
 * Most `__dirname`-relative paths in the server are fine under the
 * ahead-of-time build, because build/ mirrors the source tree exactly:
 * server/templates is build/server/templates and the same number of `..`
 * segments still lands on it.
 *
 * The exceptions are the paths that reach OUTSIDE the compiled tree -- the
 * client bundle in dist/ and the prebuilt pages in public/, both of which stay
 * at the repo root. Those cannot use a fixed hop count, because build/ adds a
 * level: `server/routes/../../dist` is the repo root, but
 * `build/server/routes/../../dist` is build/dist, which does not exist. That
 * mismatch served a 404 for index.html from an otherwise healthy API.
 *
 * Walking up to the directory that owns package.json gives the right answer in
 * both layouts, with nothing to keep in sync.
 */
/*
 * The OUTERMOST such directory, not the nearest one.
 *
 * This used to stop at the first package.json above it, which was the
 * deployment root only for as long as nothing in between had one. Once
 * apps/server became a workspace package it did, and build-server mirrors that
 * manifest into build/ -- so PROJECT_ROOT silently became
 * /duelyst/build/apps/server and the API answered 404 for the client it was
 * supposed to be serving, from `PROJECT_ROOT/public/<env>/index.html`.
 *
 * A directory only counts as a candidate if it also carries node_modules or
 * pnpm-workspace.yaml, so an unrelated package.json somewhere above a checkout
 * (a home directory, say) cannot drag the root upwards.
 */
function findProjectRoot(from: string): string {
  let dir = from;
  let found: string | null = null;
  for (;;) {
    const hasManifest = fs.existsSync(path.join(dir, 'package.json'));
    const looksLikeRoot =
      fs.existsSync(path.join(dir, 'node_modules')) ||
      fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'));
    if (hasManifest && looksLikeRoot) found = dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!found) {
    throw new Error(`could not locate the project root above ${from}`);
  }
  return found;
}

module.exports.PROJECT_ROOT = findProjectRoot(__dirname);
