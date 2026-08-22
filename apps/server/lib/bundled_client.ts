/*
 * Whether this deployment ships the built browser client inside the image.
 *
 * Upstream ran the client off S3/CDN: in any non-development environment the
 * API downloaded index.html from the CDN at boot (exiting if that failed) and
 * never mounted dist/src. There is no `public/<env>/` in this repo, so a
 * production boot without a CDN both fails to start and, if it did start, would
 * serve nothing.
 *
 * A self-hosted deployment builds the client into the image instead
 * (docker/web.Dockerfile). When that is the case both behaviours switch off:
 * no CDN download at boot, and dist/src is served directly. When it is not,
 * everything behaves exactly as upstream did.
 */
const path = require('path');
const fs = require('fs');
const { PROJECT_ROOT } = require('./project_root');

const CLIENT_DIST = path.resolve(PROJECT_ROOT, 'dist/src');
const hasBundledClient = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

module.exports = { CLIENT_DIST, hasBundledClient };
