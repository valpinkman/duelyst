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
function findProjectRoot(from: string): string {
  let dir = from;
  while (!fs.existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`could not locate the project root above ${from}`);
    }
    dir = parent;
  }
  return dir;
}

module.exports.PROJECT_ROOT = findProjectRoot(__dirname);
