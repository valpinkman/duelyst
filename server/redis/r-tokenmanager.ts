/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const _ = require('underscore');
const Promise = require('bluebird');
const moment = require('moment');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const warlock = require('@counterplay/warlock');
const Logger = require('../../app/common/logger');
const config = require('../../config/config');
const GameType = require('../../app/sdk/gameType');

const env = config.get('env');

// Returns the Redis key prefix used
const keyPrefix = () => `${env}:matchmaking:tokens`;

/**
 * Generate a 'matchmaking' token id
 * id is returned the client for listening to errors on (via Firebase)
 * @return {String} url safe token id
 */
const createTokenId = function () {
  const id = Buffer.from(uuidv4()).toString('base64');
  id.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');

  return id;
};

/**
 * Class 'RedisTokenManager'
 * Manages player 'matchmaking' tokens in Redis
 * Each player has only a single token in existance at any given time
 * Tokens are stored as hashes (objects) in Redis
 */
class RedisTokenManager {
  /**
   * Constructor
   * @param {Object} redis, a promisified redis connection
   */
  constructor(redis) {
    // TODO: add check to ensure Redis client is already promisified
    this.redis = redis;
    this.locker = Promise.promisifyAll(warlock(redis));
  }

  /**
   * Generate a 'matchmaking' token object which will be stored in redis
   * We can set some defaults here or add extra stuff
   * @param {Object} options
   * @return {Object} matchmaking token object
   */
  create(opts) {
    if (opts == null) { opts = {}; }
    const token = {};
    token.id = createTokenId();
    token.createdAt = Date.now();
    token.userId = opts.userId;
    token.name = opts.name;
    token.rank = opts.rank;
    token.deck = opts.deck;
    token.factionId = opts.factionId;
    token.gameType = opts.gameType || GameType.Ranked;
    token.inviteId = opts.inviteId || null;
    token.cardBackId = opts.cardBackId || null;
    token.deckValue = opts.deckValue || 0;
    token.lastOpponentId = opts.lastOpponentId || null;
    token.ticketId = opts.ticketId || null;
    if (opts.battleMapIndexes) {
      token.battleMapIndexes = opts.battleMapIndexes;
    }
    token.riftRating = opts.riftRating || null;
    return token;
  }

  /**
   * Save the token to Redis
   * We can set some defaults here or add extra stuff
   * @param {Object} token
   * @return {Promise} Redis 'OK'
   */
  add(token) {
    const playerId = token.userId;
    const tokenKey = keyPrefix() + playerId;
    if (token.deck != null) { token.deck = JSON.stringify(token.deck); }
    if (token.battleMapIndexes != null) { token.battleMapIndexes = JSON.stringify(token.battleMapIndexes); }
    return this.redis.hmsetAsync(tokenKey, token);
  }

  /**
   * Remove the token or tokens from Redis in single op
   * @param {String|Array} playerId or array of playerIds
   * @return {Promise} number of elements removed
   */
  remove(playerIds) {
    const args = [];
    if (_.isArray(playerIds)) {
      _.each(playerIds, (playerId) => {
        const tokenKey = keyPrefix() + playerId;
        return args.push(tokenKey);
      });
    } else {
      const tokenKey = keyPrefix() + playerIds;
      args.push(tokenKey);
    }
    return this.redis.delAsync(args);
  }

  /**
   * Does the player have a token
   * ie. they are waiting for a game (queue or friendly)
   * @param {String} playerId
   * @return {Promise} true or false
   */
  exists(playerId) {
    const tokenKey = keyPrefix() + playerId;
    return this.redis.existsAsync(tokenKey);
  }

  /**
   * Get the token object from Redis
   * @param {String} playerId
   * @return {Promise} token object
   */
  get(playerId) {
    const tokenKey = keyPrefix() + playerId;
    return this.redis.hgetallAsync(tokenKey) // return entire token object
      .then((token) => {
      // TODO: There might be other data that we want to convert to correct format here
        if (token != null) {
          if (token.deck != null) {
            token.deck = JSON.parse(token.deck);
          }
          if (token.battleMapIndexes != null) {
            token.battleMapIndexes = JSON.parse(token.battleMapIndexes);
          }
          return token;
        }
        return null;
      });
  }

  /**
   * Get the token's id from Redis
   * @param {String} playerId
   * @return {Promise} token id
   */
  getId(playerId) {
    const tokenKey = keyPrefix() + playerId;
    return this.redis.hgetAsync(tokenKey, 'id'); // return token id only
  }

  /**
   * Get the token's parameter (deck, rank, etc) from Redis
   * @param {String} playerId
   * @param {String} the parameter we want to retrieve
   * @return {Promise} token id
   */
  getParameter(playerId, param) {
    const tokenKey = keyPrefix() + playerId;
    return this.redis.hgetAsync(tokenKey, param); // return specified token param only
  }

  /**
   * Lock the player's token to signal it is in use
   * @param {String} playerId
   * @param {Integer} ttl (in seconds) on the lock
   * @return {Promise} unlock function if lock acquired
   */
  lock(playerId, ttl) {
    if (ttl == null) { ttl = 5000; }
    return this.locker.lockAsync(playerId, ttl);
  }

  /**
   * Check if a player's token is locked
   * @param {String} playerId
   * @return {Promise} bool if lock is set
   */
  isLocked(playerId) {
    return this.locker.isLockedAsync(playerId);
  }
}

/**
 * Export a factory
 */
module.exports = (exports = function (redis, opts) {
  const TokenManager = new RedisTokenManager(redis, opts);
  return TokenManager;
});
