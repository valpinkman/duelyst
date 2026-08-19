const fs = require('fs');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const Logger = require('../../app/common/logger');

/*
 * Fetch one file and stream it to disk.
 *
 * This replaces the `request` package, which is deprecated AND frozen at its
 * final version - its advisories can never be fixed, so the only way off it is
 * to stop using it. Node's built-in fetch covers this directly and
 * decompresses gzip transparently, which is what `{ gzip: true }` asked
 * `request` for.
 *
 * It lives here rather than in server/api.ts because that module boots the
 * server as a side effect of being required, so nothing in it can be tested.
 * Only staging/production ever call this (development serves the built
 * index.html straight out of dist/src), which is exactly why it needs its own
 * tests: nothing else exercises it.
 *
 * The callback signature is deliberate. The boot sequence treats a failed
 * register.html as a warning and a failed index.html as fatal, and that
 * distinction is easy to lose in a refactor.
 */
const downloadHtml = function (origin, destination, cb) {
  Logger.module('API').warn(`Downloading ${origin} to ${destination}.`);

  return fetch(origin)
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`request returned status ${res.status}`);
      }
      // streamed, not buffered, matching the previous .pipe()
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destination));
      Logger.module('API').warn(`Downloaded ${origin} to ${destination}`);
      return cb(null);
    })
    .catch((err) => {
      Logger.module('API').error(`Failed to download ${origin} to ${destination}: ${err}`);
      return cb(err);
    });
};

module.exports = downloadHtml;
