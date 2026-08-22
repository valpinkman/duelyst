/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let RedisPlayerQueue;
const _ = require('underscore');
const crypto = require('crypto');
let ts = require('./r-timeseries');
const Logger = require('@duelyst/common/logger');
const config = require('@duelyst/config');

const env = config.get('env');

// Helper returns the Redis key prefix
const keyPrefix = () => `${env}:matchmaking:`;

// Helper returns a random string of specified length
const randomString = (length) =>
  crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

// Helper returns a random key
const randomKey = () => randomString(8);

// Defaults used in constructor
const defaults = { name: randomKey() };

/**
 * Class 'RedisPlayerQueue'
 * Manages player queue data structure in Redis
 * Player queues are sorted sets (zset), sorted by rank
 * Create for each different player queue, ie: normal, ranked, casual
 * Contains 5 timeseries to queue velocity by division
 */
module.exports = RedisPlayerQueue = class RedisPlayerQueue {
  declare name: any;
  declare queue: any;
  declare redis: any;
  declare ts_bronze: any;
  declare ts_casual: any;
  declare ts_diamond: any;
  declare ts_elite: any;
  declare ts_gauntlet: any;
  declare ts_gold: any;
  declare ts_silver: any;
  /**
   * Constructor
   * Gives itself a random name if none specified
   * @param {Object} redis, a promisified redis connection
   * @param {Object} options, opts.name sets the queue's name
   */
  constructor(redis, opts) {
    // TODO: add check to ensure Redis client is already promisified
    if (opts == null) {
      opts = {};
    }
    this.redis = redis;
    this.name = opts.name || defaults.name;
    this.queue = `${keyPrefix()}queue:${this.name}`;

    // Timeseries initialization
    this.ts_bronze = new ts(this.redis, { name: `${this.name}:bronze` });
    this.ts_silver = new ts(this.redis, { name: `${this.name}:silver` });
    this.ts_gold = new ts(this.redis, { name: `${this.name}:gold` });
    this.ts_diamond = new ts(this.redis, { name: `${this.name}:diamond` });
    this.ts_elite = new ts(this.redis, { name: `${this.name}:elite` });
    this.ts_gauntlet = new ts(this.redis, { name: `${this.name}:gauntlet` });
    this.ts_casual = new ts(this.redis, { name: `${this.name}:casual` });

    // Logger.module("REDIS").log("playerqueue(#{@name}) - #{@queue}")
  }

  /**
   * Add player to *this* queue
   * @param {String} playerId
   * @param {Integer} rank
   * @return {Promise} number of elements added to the zset
   */
  add(playerId, rank) {
    // Logger.module("REDIS-QUEUE").log("add(#{playerId}, #{rank})")
    if (rank == null) {
      rank = 30;
    }
    return this.redis.zadd(this.queue, rank, playerId);
  }

  /**
   * Remove a player or players from *this* queue in single op
   * @param {String|Array} playerId or array of playerIds
   * @return {Promise} number of elements removed fom the zset
   */
  remove(playerIds) {
    // Logger.module("REDIS-QUEUE").log("remove(#{playerIds})")
    const args = [];
    args.push(this.queue);
    if (_.isArray(playerIds)) {
      _.each(playerIds, (playerId) => args.push(playerId));
    } else {
      args.push(playerIds);
    }
    return this.redis.zrem(args);
  }

  /**
   * Return player's current rank (zscore) in *this* queue
   * Returns null if the player is not queued
   * @param {String} playerId
   * @return {Promise} current rank in queue
   */
  isPlayerQueued(playerId) {
    // Logger.module("REDIS-QUEUE").log("isPlayerQueued(#{playerId})")
    return this.redis.zscore(this.queue, playerId);
  }

  /**
   * Return the number of players in the queue
   * @return {Promise} number of players
   */
  count() {
    // Logger.module("REDIS-QUEUE").log("count()")
    return this.redis.zcard(this.queue);
  }

  /**
   * Search the queue for players between matchmaking score metrics
   * Providing score and search radius as parameters
   * @param {Object} options, opts.score, opts.searchRadius
   * @return {Promise} an array of matching player ids
   */
  search(opts) {
    let score;
    if (opts == null) {
      opts = {};
    }
    if (opts.score === undefined) {
      score = 30;
    } else {
      ({ score } = opts);
    }
    const searchRadius = opts.searchRadius || 0;
    // calculate min/max by search readius
    const min = Math.max(score - searchRadius, 0); // minimum matchmaking metric is 0
    const max = Math.min(score + searchRadius, 300); // maximum matchmaking metric is 300
    // Logger.module("REDIS-QUEUE").log "searchQueue(#{score}) between [#{min},#{max}]"
    return this.redis.zrangebyscore(this.queue, min, max);
  }

  /**
   * Return all players in the queue
   * withScores option includes each player's rank (zscore)
   * @param {Object} options, opts.withScores
   * @return {Promise} array [player1,...,playerN] | [player1,rank1,...,playerN,rankN]
   */
  grab(opts) {
    // Logger.module("REDIS-QUEUE").log("grab()")
    if (opts == null) {
      opts = {};
    }
    const withScores = opts.withScores || false;
    if (withScores) {
      return this.redis.zrange(this.queue, 0, -1, 'WITHSCORES');
    }
    return this.redis.zrange(this.queue, 0, -1);
  }

  /**
   * Mark a hit in our time series when a match is made
   * Rounds values that are too low or too high
   * @param {String} the division the match was made
   * @param {Integer} in ms, the time spent waiting in queue
   */
  matchMade(division, waitTime) {
    Logger.module('REDIS-QUEUE').debug(`matchMade(${division},${waitTime})`);

    switch (division) {
      case 'bronze':
        ts = this.ts_bronze;
        break;
      case 'silver':
        ts = this.ts_silver;
        break;
      case 'gold':
        ts = this.ts_gold;
        break;
      case 'diamond':
        ts = this.ts_diamond;
        break;
      case 'elite':
        ts = this.ts_elite;
        break;
      case 'gauntlet':
        ts = this.ts_gauntlet;
        break;
      case 'casual':
        ts = this.ts_casual;
        break;
      default:
        ts.hit = function () {};
    }

    // Set a bound on waitTime hits, between [1 minute and 10 minutes]
    // if waitTime < 60000 # 1 minute in ms
    //   waitTime = 60000

    if (waitTime > 600000) {
      // 10 minutes in ms
      waitTime = 600000;
    }

    // TODO: want to validate the timestamp as bad data will mess up calculations
    // recording a hit with the timestamp as the value
    ts.hit(waitTime);
  }

  /**
   * Calculates the queue velocity by division
   * Averages the last hour of wait times in the queue
   * @param {String} the division to calculate velocity for
   * @return {Promise} in ms, the average wait time
   */
  velocity(division) {
    // Logger.module("REDIS-QUEUE").log("velocity(#{division})")

    // this sucks, part deux
    switch (division) {
      case 'bronze':
        ts = this.ts_bronze;
        break;
      case 'silver':
        ts = this.ts_silver;
        break;
      case 'gold':
        ts = this.ts_gold;
        break;
      case 'diamond':
        ts = this.ts_diamond;
        break;
      case 'elite':
        ts = this.ts_elite;
        break;
      case 'gauntlet':
        ts = this.ts_gauntlet;
        break;
      case 'casual':
        ts = this.ts_casual;
        break;
      default:
        return Promise.resolve(60000);
    }

    // defaults to 1hr, query the time series
    return ts.query().then((results) => {
      // size = total number of matches made in query range
      const size = _.size(results);
      const sum = _.reduce(results, (memo, num) => memo + parseInt(num), 0);
      const avg = Math.floor(sum / size);

      // console.log "durations " + results
      // console.log "size " + size
      // console.log "sum (mins) " + sum / 60000
      // console.log "avg (mins) " + avg / 60000

      if (size <= 8) {
        // can set a minimum sample size here
        return 60000;
      }
      return avg;
    });
  }
};
