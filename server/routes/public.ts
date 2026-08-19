/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const path = require('path');
const os = require('os');
const prettyjson = require('prettyjson');
const express = require('express');
const helmet = require('helmet');
const moment = require('moment');
const _ = require('underscore');
const Logger = require('../../app/common/logger');
const Errors = require('../lib/custom_errors');
const knex = require('../lib/data_access/knex');
const Promise = require('bluebird');
const { Redis, SRankManager, RiftManager } = require('../redis');
const config = require('../../config/config.js');

const env = config.get('env');
const { version } = require('../../version');

const router = express.Router();

const poolStats = function (pool) {
  const stats = {
    size: pool.getPoolSize(),
    min: pool.getMinPoolSize(),
    max: pool.getMaxPoolSize(),
    available: pool.availableObjectsCount(),
    queued: pool.waitingClientsCount(),
  };
  return stats;
};

const serveIndex = function (req, res) {
  // set no cache header
  res.setHeader('Cache-Control', 'no-cache');
  // serve index.html file
  if (config.isDevelopment()) {
    return res.sendFile(path.resolve(__dirname + '/../../dist/src/index.html'));
  // Staging/Production mode uses index.html from S3
  } else {
    return res.sendFile(path.resolve(__dirname + '/../../public/' + env + '/index.html'));
  }
};

const serveRegister = function (req, res) {
  // set no cache header
  res.setHeader('Cache-Control', 'no-cache');
  // serve index.html file
  if (config.isDevelopment()) {
    return res.sendFile(path.resolve(__dirname + '/../../dist/src/register.html'));
  // Staging/Production mode uses register.html from S3
  } else {
    return res.sendFile(path.resolve(__dirname + '/../../public/' + env + '/register.html'));
  }
};

// Setup routes for production / development mode
// Development mode uses index.html from /dist folder
if (config.isDevelopment()) {
  Logger.module('EXPRESS').log(`Configuring for DEVELOPMENT environment ${env}`.yellow);

  // Serve enter /dist/src folder
  router.use(express.static(__dirname + '/../../dist/src', { etag: false, lastModified: false, maxAge: 0 }));

  // Serve main index page /dist/src/index.html
  router.get('/', serveIndex);
  router.get('/game', serveIndex);
  router.get('/register', serveRegister);
  router.get('/login', serveRegister);
  router.post('/', serveIndex);
} else {
  Logger.module('EXPRESS').log(`Configuring for PRODUCTION environment ${env}`.cyan);

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
    .then((topPlayerIds) => // TODO: Needs validation that this maintains order
      Promise.map(
        topPlayerIds,
        (playerId) => knex.first('username').from('users').where('id', playerId),
      )).then(function (topPlayerRows) {
      const topPlayerNames = _.map(topPlayerRows, (row) => row.username);
      return res.json(topPlayerNames);
    });
});

// /rift_ladder
router.get('/rift_ladder', (req, res) => RiftManager.getTopLadderUserIdAndRunIds(50)
  .then((topUserAndRunIds) => Promise.map(topUserAndRunIds, function (userAndRunId) {
    if ((userAndRunId == null)) {
      return Promise.reject(`Top Rift Ladder: Invalid user:run id: ${userAndRunId}`);
    }
    const userRunIdTuple = userAndRunId.split(':');
    if ((userRunIdTuple === null) || (userRunIdTuple.length !== 2)) {
      return Promise.reject(`Top Rift Ladder: Error parsing user:run id: ${userAndRunId}`);
    }
    const userId = userRunIdTuple[0];
    const ticketId = userRunIdTuple[1];
    return Promise.all([
      knex.first('username').from('users').where('id', userId),
      knex.first().from('user_rift_runs').where('user_id', userId).andWhere('ticket_id', ticketId),
    ]).spread(function (userNameRow, userRiftRun) {
      if ((userNameRow != null) && (userRiftRun != null)) { // Only needed in case a user's data is wiped, but good safety check to have
        return Promise.resolve({
          username: userNameRow.username,
          faction_id: userRiftRun.faction_id,
          general_id: userRiftRun.general_id,
        });
      } else {
        return Promise.resolve(null);
      }
    });
  })).then(function (topPlayerDataRows) {
    topPlayerDataRows = _.filter(topPlayerDataRows, (row) => row !== null);
    for (let i = 0, end = topPlayerDataRows.length, asc = end >= 0; asc ? i < end : i > end; asc ? i++ : i--) {
      topPlayerDataRows[i].rank = i + 1;
    }
    return res.json(topPlayerDataRows);
  }));

// /healthcheck
// Simple HTTP/200 response for use with load balancer health checks.
router.get('/healthcheck', (req, res) => res.status(200).send('OK'));

// /health
// Comprehensive health check taking DB connection pool status into account.
router.get('/health', function (req, res) {
  const MAX_QUEUED_ALLOWED = 25;
  const pool = poolStats(knex.client.pool);
  return Promise.all([
    knex('knex_migrations').select('migration_time').orderBy('id', 'desc').limit(1),
  ])
    .timeout(5000)
    .spread(function (row) {
      if (pool.queued >= MAX_QUEUED_ALLOWED) {
        res.status(500);
      } else {
        res.status(200);
      }
      return res.json({ pool });
    }).catch(Promise.TimeoutError, (e) => res.status(500).json({ message: 'db timeout' }))
    .catch((e) => res.status(500).json({ message: 'db error' }));
});

// /stats
router.get('/stats', function (req, res) {
  const serverId = os.hostname();
  const getPlayers = Redis.hgetAsync(`servers:${serverId}`, 'players');
  const getGames = Redis.hgetAsync(`servers:${serverId}`, 'games');

  return Promise.join(getPlayers, getGames, (players, games) => res.json({ players, games, pool: poolStats(knex.client.pool) }));
});

router.get('/replay', function (req, res, next) {
  // replay id from query string params
  const replayId = req.query.replayId || null;
  // where to grab the javascript version
  // use staging CDN in development / testing
  let urlOrigin = config.get('cdn');
  if ((urlOrigin == null)) {
    urlOrigin = window.location.origin;
  }

  return knex('user_replays').where('replay_id', replayId).first()
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
