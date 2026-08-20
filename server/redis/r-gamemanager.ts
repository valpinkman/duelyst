/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('../../app/common/logger');
const config = require('../../config/config');

const env = config.get('env');
const ttl = config.get('redis.ttl');
const generatePushID = require('../../app/common/generate_push_id');
const zlib = require('zlib');
const { promisify } = require('util');
const PromiseUtils = require('../../app/common/utils/utils_promise');
// bluebird's promisifyAll gave us gzipAsync/gunzipAsync; node's promisify is the
// direct replacement and needs no extra dependency
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

// Helper returns the Game Data Redis key prefix
const keyPrefix = () => `${env}:games:`;

// Helper returns the Game Mouse/UI Event Data Redis key prefix
const keyPrefixForMouseUIData = () => `${env}:games_mouse_ui_data:`;

/**
 * Class 'RedisGameManager'
 * Manages storage of games in Redis
 * Serialized games are stored by incrementing id
 * ttl sets the expiration time of keys, defaults to 72 hours
 */
class RedisGameManager {
  declare redis: any;
  /**
   * Constructor
   * @param {Object} redis, a promisified redis connection
   */
  constructor(redis, opts) {
    // TODO: add check to ensure Redis client is already promisified
    if (opts == null) { opts = {}; }
    this.redis = redis;
  }

  /**
   * Generate a unique id for the game using atomic increment
   * @param {Function|optional} callback
   * @return {Promise}
   */
  generateGameId(callback) {
    const p = new Promise((resolve, reject) => resolve(generatePushID()));

    return PromiseUtils.nodeify(p, callback);
  }

  /**
   * Save *serialized* game session data to redis
   * @param {String} the game id to be used as the key
   * @param {Object} the game data *after* serializing
   * @param {Function|optional} callback
   * @return {Promise}
   */
  saveGameSession(gameId, serializedGameData, callback) {
    Logger.module('REDIS').debug(`saveGameSession() -> saving GameSession ${gameId}`);
    const gameKey = keyPrefix() + gameId;
    return PromiseUtils.nodeify(gzipAsync(serializedGameData)
      .then((gzipGameData) => {
      // gzipGameData is a buffer
        const multi = this.redis.multi(); // start a multi command
        multi.set(gameKey, gzipGameData);
        multi.expire(gameKey, ttl); // mark to expire at ttl
        return multi.exec();
      }), callback);
  }

  /**
   * Load *serialized* game session data from redis
   * @param {String} the game id to be used as the key
   * @param {Function|optional} callback
   * @return {Promise}
   */
  loadGameSession(gameId, callback) {
    Logger.module('REDIS').debug(`loadGameSession() -> loading GameSession ${gameId}`);
    const gameKey = keyPrefix() + gameId;
    // getBuffer() rather than get(): the value is gzipped game state and must
    // come back as a Buffer. Under redis@2 this was expressed by passing a
    // Buffer KEY, which the `detect_buffers: true` client option turned into a
    // Buffer reply. ioredis has no such option and an explicit variant instead.
    return PromiseUtils.nodeify(this.redis.getBuffer(gameKey)
      .then((buffer) => {
        if (buffer) {
          return gunzipAsync(buffer);
        }
        // just return the empty buffer (null)
        return buffer;
      }), callback);
  }

  /**
   * Save *serialized* game mouse and ui data to redis
   * @param {String} the game id to be used as the key
   * @param {Object} the data *after* serializing
   * @param {Function|optional} callback
   * @return {Promise}
   */
  saveGameMouseUIData(gameId, serializedData, callback) {
    Logger.module('REDIS').debug(`saveGameMouseUIData() -> saving data for game ${gameId}`);
    const key = keyPrefixForMouseUIData() + gameId;
    return PromiseUtils.nodeify(gzipAsync(serializedData)
      .then((gzipMouseData) => {
      // gzipMouseData is a buffer
        const multi = this.redis.multi(); // start a multi command
        multi.set(key, gzipMouseData);
        multi.expire(key, ttl); // mark to expire at ttl
        return multi.exec();
      }), callback);
  }

  /**
   * Load *serialized* game mouse and ui data from redis
   * @param {String} the game id to be used as the key
   * @param {Function|optional} callback
   * @return {Promise}
   */
  loadGameMouseUIData(gameId, callback) {
    Logger.module('REDIS').debug(`loadGameMouseUIData() -> loading data for game ${gameId}`);
    const key = keyPrefixForMouseUIData() + gameId;
    return PromiseUtils.nodeify(this.redis.getBuffer(key)
      .then((buffer) => {
        if (buffer) {
          return gunzipAsync(buffer);
        }
        // just return the empty buffer (null)
        return buffer;
      }), callback);
  }
}

/**
 * Export a factory
 */
module.exports = (exports = function (redis, opts) {
  const GameManager = new RedisGameManager(redis, opts);
  return GameManager;
});
