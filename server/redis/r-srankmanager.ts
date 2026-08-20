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
  if (!RedisSRankManager.unitTestMode) {
    return `${env}:s_rank_ladder:`;
  }
  return `${env}:s_rank_ladder:test:`;
};

const seasonKey = (seasonStartMoment) => seasonStartMoment.format('YYYY_MM');

const expireAtTimeForSeasonStart = function (seasonStartMoment) {
  if (!RedisSRankManager.unitTestMode) {
    const startOfNextSeasonMoment = seasonStartMoment.clone().add(1, 'month');
    // add a single day for overlap
    startOfNextSeasonMoment.add(1, 'day');
    return startOfNextSeasonMoment.valueOf();
  }
  return moment.utc().add(1, 'hour').valueOf();
};

/**
 * Class 'RedisSRankManager'
 * Manages storage of srank ladder ratings/position in Redis
 * ttl sets the expiration time of keys, defaults to 72 hours
 */
class RedisSRankManager {
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
   * Updates the ladder rating of a player by user id
   * @param {String} userId user id being updated
   * @param {Moment} seasonStartMoment moment representing the start of the month of the season
   * @param {Integer} ladderRating players new ladder rating
   * @return {Promise}
   */
  updateUserLadderRating(userId, seasonStartMoment, ladderRating) {
    Logger.module('REDIS').debug(
      `updateUserLadderRating() -> updating Ladder Rating for player ${userId} to ${ladderRating}`,
    );
    const redisSeasonKey = keyPrefix() + seasonKey(seasonStartMoment);
    const multi = this.redis.multi(); // start a multi command
    multi.zadd(redisSeasonKey, ladderRating, userId);
    multi.expireat(redisSeasonKey, expireAtTimeForSeasonStart(seasonStartMoment));

    return multi.exec();
  }

  /**
   * Retrieves player's srank ladder position
   * @param {String} userId user id being updated
   * @param {Moment} seasonStartMoment moment representing the start of the month of the season
   * @return {Promise} Resolves to a integer for players ladder position
   */
  getUserLadderPosition(userId, seasonStartMoment) {
    Logger.module('REDIS').debug(
      `updateUserLadderRating() -> getting Ladder Position for ${userId}`,
    );

    const redisSeasonKey = keyPrefix() + seasonKey(seasonStartMoment);

    return this.redis.zrevrank(redisSeasonKey, userId).then((ladderPosition) => {
      if (ladderPosition != null) {
        return Promise.resolve(parseInt(ladderPosition) + 1);
      }
      return Promise.resolve(null);
    });
  }

  /**
   * Gets top srank ladder player ids
   * @param {moment} seasonStartMoment moment for the start of season being retrieved
   * @param {integer} numPlayers
   * @return {Promise} An array of user ids in order of top players
   */
  getTopLadderUserIds(seasonStartMoment, numPlayers) {
    Logger.module('REDIS').debug(
      `getTopLadderUserIds() -> retrieving top ${numPlayers} s-rank players for season ${seasonKey(seasonStartMoment)}`,
    );

    const redisSeasonKey = keyPrefix() + seasonKey(seasonStartMoment);

    return this.redis.zrevrange(redisSeasonKey, 0, numPlayers - 1);
  }

  /**
   * Synchronous - Returns true/false whethere a season's ratings can still be found in Redis
   * @param {moment} seasonStartMoment moment for the start of season being retrieved
   * @param {moment} systemTime current time of the system
   * @return {boolean} Whether provided season's data is active in Redis
   */
  getSeasonIsStillActiveInRedis(seasonStartMoment, systemTime) {
    const seasonExpireMoment = moment.utc(expireAtTimeForSeasonStart(seasonStartMoment));
    return seasonExpireMoment.isAfter(systemTime);
  }

  /**
   * This method has no use in normal user flow, it's only purpose is QA and wiping a user
   * @param {String} userId user id being removed
   * @param {Moment} seasonStartMoment moment representing the start of the month of the season
   * @return {Promise} Promise that returns on operation completion, no value
   */
  _removeUserFromLadder(userId, seasonStartMoment) {
    Logger.module('REDIS').debug(
      `updateUserLadderRating() -> getting Ladder Position for ${userId}`,
    );

    const redisSeasonKey = keyPrefix() + seasonKey(seasonStartMoment);

    return this.redis.zrem(redisSeasonKey, userId);
  }
}

/**
 * Export a factory
 */
module.exports = exports = function (redis, opts) {
  const SRankManager = new RedisSRankManager(redis, opts);
  return SRankManager;
};
