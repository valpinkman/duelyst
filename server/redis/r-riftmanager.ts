/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const moment = require('moment');
const Logger = require('../../app/common/logger');
const config = require('../../config/config');

const env = config.get('env');
const ttl = config.get('redis.ttl');
const generatePushID = require('../../app/common/generate_push_id');
const zlib = require('zlib');
const { promisify } = require('util');
// bluebird's promisifyAll gave us gzipAsync/gunzipAsync; node's promisify is the
// direct replacement and needs no extra dependency
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

// Helper returns the SRank Ladder Redis key prefix
const keyPrefix = function () {
  if (!RedisRiftManager.unitTestMode) {
    return `${env}:rift_ladder`;
  }
  return `${env}:rift_ladder:test`;
};

const expireAtTime = function (systemTime) {
  const MOMENT_NOW_UTC = systemTime || moment().utc();
  if (!RedisRiftManager.unitTestMode) {
    const expireAtMoment = MOMENT_NOW_UTC.clone().add(2, 'week');
    return expireAtMoment.valueOf();
  }
  return moment.utc().add(1, 'hour').valueOf();
};

/**
 * Class 'RedisRiftManager'
 * Manages storage of rift ladder ratings/position in Redis
 * ttl sets the expiration time of keys, defaults to 2 weeks
 */
class RedisRiftManager {
  declare redis: any;
  static unitTestMode = false;

  /**
   * Constructor
   * @param {Object} redis, a promisified redis connection
   */
  constructor(redis, opts) {
    if (opts == null) {
      opts = {};
    }
    this.redis = redis;
  }

  /**
   * Updates the ladder rating of a player by user id and rift ticket id
   * @param {String} userId user id being updated
   * @param {String} ticketId run/ticket id being updated
   * @param {Integer} riftRating players new ladder rating
   * @return {Promise}
   */
  updateUserRunRiftRating(userId, ticketId, riftRating, systemTime) {
    Logger.module('REDIS').debug(
      `updateUserRunHighestRiftRating() -> updating Rift rating for player ${userId} run ${ticketId} to ${riftRating}`,
    );
    const redisKey = keyPrefix();
    const userRunKey = `${userId}:${ticketId}`;
    const multi = this.redis.multi(); // start a multi command
    multi.zadd(redisKey, riftRating, userRunKey);
    multi.expireat(redisKey, expireAtTime(systemTime));

    return multi.exec();
  }

  /**
   * Retrieves player's srank ladder position
   * @param {String} userId user id being updated
   * @param {String} ticketId run/ticket id being updated
   * @return {Promise} Resolves to a integer for players ladder position
   */
  getUserRunLadderPosition(userId, ticketId, systemTime) {
    Logger.module('REDIS').debug(
      `updateUserLadderRating() -> getting Ladder Position for user ${userId} run ${ticketId}`,
    );

    const redisRiftKey = keyPrefix();
    const userRunKey = `${userId}:${ticketId}`;

    return this.redis.zrevrank(redisRiftKey, userRunKey).then((ladderPosition) => {
      if (ladderPosition != null) {
        return Promise.resolve(parseInt(ladderPosition) + 1);
      }
      return Promise.resolve(null);
    });
  }

  /**
   * Gets top rift ladder player&run id tuples
   * @param {integer} numPlayers
   * @return {Promise} An array of "userId:runId" in order of top players
   */
  getTopLadderUserIdAndRunIds(numPlayers) {
    Logger.module('REDIS').debug(
      `getTopLadderUserIds() -> retrieving top ${numPlayers} rift players`,
    );

    const redisKey = keyPrefix();

    return this.redis.zrevrange(redisKey, 0, numPlayers - 1);
  }

  /**
   * This method has no use in normal user flow, it's only purpose is QA and wiping a user
   * @param {String} userId user id being removed
   * @param {String} ticketId run id being removed
   * @return {Promise} Promise that returns on operation completion, no value
   */
  _removeUserRunFromLadder(userId, ticketId) {
    const userRunKey = `${userId}:${ticketId}`;
    Logger.module('REDIS').debug(
      `updateUserLadderRating() -> getting Ladder Position for ${userRunKey}`,
    );

    const redisKey = keyPrefix();

    return this.redis.zrem(redisKey, userRunKey);
  }
}

/**
 * Export a factory
 */
module.exports = exports = function (redis, opts) {
  const RiftManager = new RedisRiftManager(redis, opts);
  return RiftManager;
};
