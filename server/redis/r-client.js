/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let RedisClient;
const Promise = require('bluebird');
const redis = require('redis');

const Logger = require('../../app/common/logger');
const config = require('../../config/config');

Promise.promisifyAll(redis);

// redis client
module.exports = (RedisClient = redis.createClient({
  host: config.get('redis.host'),
  port: config.get('redis.port'),
  detect_buffers: true,
}));

// redis auth
const redisPassword = config.get('redis.password');
if (redisPassword) {
  RedisClient.auth(redisPassword);
}

// Ready event
RedisClient.on('ready', () => Logger.module('REDIS').debug('client onReady'));

// Connect event
RedisClient.on('connect', () => Logger.module('REDIS').debug('client onConnect'));

// Error event
// TODO: We should probably do something if we receive an error
RedisClient.on('error', (error) => Logger.module('REDIS').error(`client onError: ${JSON.stringify(error)})`));
