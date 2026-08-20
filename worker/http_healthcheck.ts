/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// Boots up a basic HTTP server on port 8080
// Responds to /health endpoint with status 200
// Otherwise responds with status 404

const Logger = require('../app/common/logger');
const http = require('http');
const url = require('url');
const os = require('os');
const Promise = require('bluebird');
const config = require('../config/config');
const knex = require('../server/lib/data_access/knex');
const PromiseUtils = require('../app/common/utils/utils_promise');
const { onType } = require('../app/common/utils/utils_promise');

const MAX_QUEUED_ALLOWED = 25;

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

const healthcheck = function () {
  const server = http.createServer(function (req, res) {
    const {
      pathname,
    } = url.parse(req.url);
    if (pathname === '/health') {
      Logger.module('MATCHMAKER').debug('HTTP health check : /health requested.');
      const pool = poolStats(knex.client.pool);
      return PromiseUtils.withTimeout(Promise.all([
        knex('knex_migrations').select('migration_time').orderBy('id', 'desc').limit(1),
      ]), 5000)
        .then(function ([row]) {
          if (pool.queued >= MAX_QUEUED_ALLOWED) {
            return res.statusCode = 500;
          } else {
            return res.statusCode = 200;
          }
        }).catch(onType(PromiseUtils.TimeoutError, (e) => res.statusCode = 500))
        .catch((e) => res.statusCode = 500)
        .finally(function () {
          res.write(JSON.stringify({ pool }));
          return res.end();
        });
    } else {
      // Logger.module("MATCHMAKER").debug "HTTP health check: 404 bad request received."
      res.statusCode = 404;
      return res.end();
    }
  });

  return server.listen(8080, () => Logger.module('MATCHMAKER').debug('HTTP health check : running on port 8080 /health.'));
};

module.exports = healthcheck;
