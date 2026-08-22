/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require('path');
const { PROJECT_ROOT } = require('apps/server/lib/project_root');
const os = require('os');
const prettyjson = require('prettyjson');
const express = require('express');
const helmet = require('helmet');
const moment = require('moment');
const _ = require('underscore');
const Logger = require('@duelyst/common/logger');
const Errors = require('../lib/custom_errors');
const knex = require('../lib/data_access/knex');
const { Redis, SRankManager, RiftManager } = require('../redis');
const config = require('config/config.js');

const env = config.get('env');
const { version } = require('version');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');
const { onType } = require('@duelyst/common/utils/utils_promise');

const router = express.Router();

/*
 * Connection-pool stats for /health.
 *
 * knex swapped its pool implementation: 0.19 used generic-pool
 * (`getPoolSize()` / `availableObjectsCount()` / `waitingClientsCount()`),
 * knex 1+ uses tarn (`numUsed()` / `numFree()` / `numPendingAcquires()`).
 *
 * Both are handled so this endpoint keeps working either side of the upgrade -
 * and so a pool object that grows a different shape again degrades to nulls
 * rather than throwing, since this is the endpoint a load balancer polls.
 */
const poolStats = function (pool) {
  if (!pool) {
    return {
      size: null,
      min: null,
      max: null,
      available: null,
      queued: null,
    };
  }

  // tarn (knex 1+)
  if (typeof pool.numUsed === 'function') {
    const used = pool.numUsed();
    const free = pool.numFree();
    return {
      size: used + free,
      min: pool.min,
      max: pool.max,
      available: free,
      queued: typeof pool.numPendingAcquires === 'function' ? pool.numPendingAcquires() : null,
    };
  }

  // generic-pool (knex 0.19)
  return {
    size: pool.getPoolSize(),
    min: pool.getMinPoolSize(),
    max: pool.getMaxPoolSize(),
    available: pool.availableObjectsCount(),
    queued: pool.waitingClientsCount(),
  };
};

/*
 * Upstream served the client from S3/CDN in staging and production, and only
 * mounted dist/src in development -- there is no `public/<env>/` in this repo,
 * so a production boot would 404 the game itself.
 *
 * A self-hosted deployment has no CDN: the image ships the built client. So if
 * dist/src/index.html is present we serve it in every environment, and if it is
 * not we fall back to the original public/<env> behaviour untouched. Nothing
 * here changes which routes exist -- in particular /api/me/qa stays gated on
 * config.isDevelopment() in server/routes/api.ts.
 */
const { CLIENT_DIST, hasBundledClient } = require('apps/server/lib/bundled_client');

const serveIndex = function (req, res) {
  // set no cache header
  res.setHeader('Cache-Control', 'no-cache');
  // serve index.html file
  if (hasBundledClient) {
    return res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    // no bundled client: upstream's S3/CDN layout
  } else {
    return res.sendFile(path.resolve(PROJECT_ROOT, 'public', env, 'index.html'));
  }
};

const serveRegister = function (req, res) {
  // set no cache header
  res.setHeader('Cache-Control', 'no-cache');
  // serve index.html file
  if (hasBundledClient) {
    return res.sendFile(path.join(CLIENT_DIST, 'register.html'));
    // no bundled client: upstream's S3/CDN layout
  } else {
    return res.sendFile(path.resolve(PROJECT_ROOT, 'public', env, 'register.html'));
  }
};

// Setup routes for the bundled client / the original CDN layout
if (hasBundledClient) {
  Logger.module('EXPRESS').log(
    `Serving the bundled client from dist/src (environment ${env})`.yellow,
  );

  /*
   * dist/src is ~486 MB of art and audio. Development keeps upstream's
   * revalidate-everything settings so an edited asset shows up on reload;
   * anywhere else that would re-download the whole game on every visit, so
   * validators and a short max-age are on. index.html itself is still
   * no-cache (set in serveIndex), so a new build is always picked up.
   */
  const isDev = config.isDevelopment();
  router.use(
    express.static(CLIENT_DIST, {
      etag: !isDev,
      lastModified: !isDev,
      /*
       * The global noCache middleware (server/middleware/basic.ts) has already
       * set Cache-Control by the time this runs, and `send` only sets its own
       * when the header is absent -- so the static `maxAge` option is silently
       * ineffective here. setHeaders runs last and can override it.
       *
       * HTML keeps no-cache so a new build is picked up immediately; the rest
       * is art, audio and the bundle, which are what make revalidating every
       * asset on every visit untenable.
       */
      setHeaders: isDev
        ? undefined
        : (res, filePath) => {
            /*
             * duelyst.js / vendor.js / duelyst.css are NOT content-hashed, so a
             * long max-age serves a stale client for that long after a deploy --
             * which looks exactly like the new build never shipped. Only the
             * art and audio under resources/ get the long cache; they are
             * addressed by name and change with the game data, not the build.
             */
            if (filePath.endsWith('.html')) return;
            const immutable = /[\\/]resources[\\/]/.test(filePath);
            res.setHeader(
              'Cache-Control',
              immutable ? 'public, max-age=86400' : 'public, max-age=60, must-revalidate',
            );
            res.removeHeader('Surrogate-Control');
            res.removeHeader('Pragma');
            res.removeHeader('Expires');
          },
    }),
  );

  // Serve main index page /dist/src/index.html
  router.get('/', serveIndex);
  router.get('/game', serveIndex);
  router.get('/register', serveRegister);
  router.get('/login', serveRegister);
  router.post('/', serveIndex);
} else {
  Logger.module('EXPRESS').log(
    `No bundled client; expecting assets on a CDN (environment ${env})`.cyan,
  );

  // temporarily disabled to allow iframing
  // router.get "/", helmet.frameguard('deny'), serveIndex
  router.get('/', serveIndex);
  router.get('/game', serveIndex);
  router.get('/register', serveRegister);
  router.get('/login', serveRegister);
  router.post('/', serveIndex);
}

// /version
router.get('/version', (req, res) => res.json({ version }));

// /srank
router.get('/srank_ladder', function (req, res) {
  const startOfSeasonMonth = moment.utc().startOf('month');
  return SRankManager.getTopLadderUserIds(startOfSeasonMonth, 50)
    .then((topPlayerIds) =>
      // TODO: Needs validation that this maintains order
      PromiseUtils.map(topPlayerIds, (playerId) =>
        knex.first('username').from('users').where('id', playerId),
      ),
    )
    .then(function (topPlayerRows) {
      const topPlayerNames = _.map(topPlayerRows, (row) => row.username);
      return res.json(topPlayerNames);
    });
});

// /rift_ladder
router.get('/rift_ladder', (req, res) =>
  RiftManager.getTopLadderUserIdAndRunIds(50)
    .then((topUserAndRunIds) =>
      PromiseUtils.map(topUserAndRunIds, function (userAndRunId) {
        if (userAndRunId == null) {
          return Promise.reject(`Top Rift Ladder: Invalid user:run id: ${userAndRunId}`);
        }
        const userRunIdTuple = userAndRunId.split(':');
        if (userRunIdTuple === null || userRunIdTuple.length !== 2) {
          return Promise.reject(`Top Rift Ladder: Error parsing user:run id: ${userAndRunId}`);
        }
        const userId = userRunIdTuple[0];
        const ticketId = userRunIdTuple[1];
        return Promise.all([
          knex.first('username').from('users').where('id', userId),
          knex
            .first()
            .from('user_rift_runs')
            .where('user_id', userId)
            .andWhere('ticket_id', ticketId),
        ]).then(function ([userNameRow, userRiftRun]) {
          if (userNameRow != null && userRiftRun != null) {
            // Only needed in case a user's data is wiped, but good safety check to have
            return Promise.resolve({
              username: userNameRow.username,
              faction_id: userRiftRun.faction_id,
              general_id: userRiftRun.general_id,
            });
          } else {
            return Promise.resolve(null);
          }
        });
      }),
    )
    .then(function (topPlayerDataRows) {
      topPlayerDataRows = _.filter(topPlayerDataRows, (row) => row !== null);
      for (
        let i = 0, end = topPlayerDataRows.length, asc = end >= 0;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
        topPlayerDataRows[i].rank = i + 1;
      }
      return res.json(topPlayerDataRows);
    }),
);

// /healthcheck
// Simple HTTP/200 response for use with load balancer health checks.
router.get('/healthcheck', (req, res) => res.status(200).send('OK'));

// /health
// Comprehensive health check taking DB connection pool status into account.
router.get('/health', function (req, res) {
  const MAX_QUEUED_ALLOWED = 25;
  const pool = poolStats(knex.client.pool);
  return PromiseUtils.withTimeout(
    Promise.all([knex('knex_migrations').select('migration_time').orderBy('id', 'desc').limit(1)]),
    5000,
  )
    .then(function ([row]) {
      if (pool.queued >= MAX_QUEUED_ALLOWED) {
        res.status(500);
      } else {
        res.status(200);
      }
      return res.json({ pool });
    })
    .catch(
      onType(PromiseUtils.TimeoutError, (e) => res.status(500).json({ message: 'db timeout' })),
    )
    .catch((e) => res.status(500).json({ message: 'db error' }));
});

// /stats
router.get('/stats', function (req, res) {
  const serverId = os.hostname();
  const getPlayers = Redis.hget(`servers:${serverId}`, 'players');
  const getGames = Redis.hget(`servers:${serverId}`, 'games');

  return Promise.all([getPlayers, getGames]).then(([players, games]) =>
    res.json({ players, games, pool: poolStats(knex.client.pool) }),
  );
});

router.get('/replay', function (req, res, next) {
  // replay id from query string params
  const replayId = req.query.replayId || null;
  // where to grab the javascript version
  // use staging CDN in development / testing
  let urlOrigin = config.get('cdn');
  if (urlOrigin == null) {
    urlOrigin = window.location.origin;
  }

  return knex('user_replays')
    .where('replay_id', replayId)
    .first()
    .then(function (replay) {
      if (replay != null) {
        return res.render(__dirname + '/../templates/replay.hbs', {
          gameVersionAssetBucket: `${urlOrigin}/v${replay.version}`,
        });
      } else {
        throw new Errors.NotFoundError(`Replay ${replayId} not found`);
      }
    })
    .catch((e) => next(e));
});

module.exports = router;
