let RedisInviteQueue;
const _ = require('underscore');
const crypto = require('crypto');
const Logger = require('@duelyst/common/logger');
const config = require('config/config');

const env = config.get('env');

// Helper returns the Redis key prefix
const keyPrefix = () => `${env}:matchmaking:`;

/**
 * Class 'RedisInviteQueue'
 * Manages invites in Redis in a list structure
 * New list is created for each inviteId
 */
module.exports = RedisInviteQueue = class RedisInviteQueue {
  declare list: any;
  declare redis: any;
  /**
   * Constructor
   * Gives itself a random name if none specified
   * @param {Object} redis, a promisified redis connection
   * @param {Object} options, opts.name sets the queue's name
   */
  constructor(redis) {
    // TODO: add check to ensure Redis client is already promisified
    this.redis = redis;
    this.list = `${keyPrefix()}invites`;
  }

  /**
   * Add player to an invite list
   * @param {String} playerId
   * @param {String} inviteId
   * @return {Promise} length of the list
   */
  add(playerId, inviteId) {
    // Logger.module("REDIS-INVITE").log("add(#{playerId}, #{inviteId})")
    const inviteKey = `${this.list}:${inviteId}`;
    return this.redis.lpush(inviteKey, playerId);
  }

  /**
   * Delete an invite list
   * @param {String} inviteId
   * @return {Promise} true or false if deleted
   */
  clear(inviteId) {
    // Logger.module("REDIS-INVITE").log("clear(#{inviteId})")
    const inviteKey = `${this.list}:${inviteId}`;
    return this.redis.del(inviteKey);
  }

  /**
   * Return the number of players in the invite
   * @return {Promise} number of players
   */
  count(inviteId) {
    // Logger.module("REDIS-INVITE").log("count(#{inviteId})")
    const inviteKey = `${this.list}:${inviteId}`;
    return this.redis.llen(inviteKey);
  }

  /**
   * Return the list of players in the invite
   * @param {String} inviteId
   * @return {Promise} array of player ids
   */
  grab(inviteId) {
    // Logger.module("REDIS-INVITE").log("grab(#{inviteId})")
    const inviteKey = `${this.list}:${inviteId}`;
    return this.redis.lrange(inviteKey, 0, -1);
  }
};

/**
 * Export a factory
 */
module.exports = exports = function (redis) {
  const InviteQueue = new RedisInviteQueue(redis);
  return InviteQueue;
};
