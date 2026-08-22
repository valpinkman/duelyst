/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let RedisTimeSeries;
const _ = require('underscore');
const moment = require('moment');
const crypto = require('crypto');
const config = require('@duelyst/config');
const Logger = require('@duelyst/common/logger');

const env = config.get('env');

// Helper returns the Redis key prefix
const keyPrefix = () => `${env}:ts:`;

// Helper returns a random string of specified length
const randomString = (length) =>
  crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);

// Helper returns a random key
const randomKey = () => randomString(8);

// Helper returns a random value
const randomValue = () => randomString(32);

// Defaults used in constructor
const defaults = { name: randomKey() };

/**
 * Class 'RedisTimeSeries'
 * Manages time series data structure in Redis
 * Time series are sorted sets, sorted by a UTC timestamp
 * Since values must be unique, we also prefix the value w/ the timestamp
 */
module.exports = RedisTimeSeries = class RedisTimeSeries {
  declare createdAt: any;
  declare name: any;
  declare redis: any;
  declare ts: any;
  /**
   * Constructor
   * Gives itself a random name if none specified
   * @param {Object} redis, a promisified redis connection
   * @param {Object} options, opts.name sets the time series' name
   */
  constructor(redis, opts) {
    // TODO: add check to ensure Redis client is already promisified
    if (opts == null) {
      opts = {};
    }
    this.redis = redis;
    this.name = opts.name || defaults.name;
    this.ts = keyPrefix() + this.name;
    this.createdAt = moment.utc().valueOf();

    // Logger.module("REDIS").log("ts(#{@name})")
  }

  /**
   * Mark a hit in the time series
   * Will use a random value if none specified
   * Note this may cause collisions if random string is short
   * Deletes / prunes hits that are older than 72 hours on insert
   * @param {String} unique value to assosicate with hit
   * @return {Promise} returns 1 if success, 0 if fail
   */
  hit(value) {
    // Logger.module("REDIS-TS").log("hit(#{value})")

    if (value == null) {
      value = randomValue();
    }
    const timestamp = moment.utc().valueOf();
    const score = timestamp;
    // we add a timestamp to the value also to ensure some uniqueness
    // as you cannot have duplicate values in a sorted set
    value = `${timestamp}:${value}`;
    // prune data older than 72 hours, TODO: make this configurable
    const old = moment.utc().subtract(72, 'hours').valueOf();

    // delete + insert
    const multi = this.redis.multi();
    multi.zremrangebyscore(this.ts, 0, old);
    multi.zadd(this.ts, score, value);
    return multi.exec();
  }

  /**
   * Query the time series
   * @param {Object} options
   * @return {Promise} returns object contain all hits in query range
   * opts.range, hours to query the time series, defaults to 1hr
   * opts.limit, limit the number of results, defaults to 1000
   * opts.withScores, include the scores, defaults to true
   */
  query(opts) {
    let args;
    if (opts == null) {
      opts = {};
    }
    const range = opts.range || 1;
    const limit = opts.limit || 1000;
    const withScores = opts.withScores || true;

    // Logger.module("REDIS-TS").log("query(#{range})")

    const now = moment.utc().valueOf();
    const previous = moment.utc().subtract(range, 'hours').valueOf();

    if (withScores) {
      args = [this.ts, previous, now, 'WITHSCORES', 'LIMIT', 0, limit];
    } else {
      // TODO : fix without scores option
      args = [this.ts, previous, now, 'WITHSCORES', 'LIMIT', 0, limit];
    }
    return this.redis.zrangebyscore(args).then((scores) => {
      // TODO : this only works WITHSCORES = true
      const values = [];
      // scores is an array [] where even/odd pairs are the value, score
      // zip up the array into an object keyed by score
      while (scores.length > 0) {
        const value = scores.shift();
        const score = scores.shift();
        // remove the timestamp added to the value
        values.push(value.split(':')[1]);
      }
      return values;
    });
  }

  /**
   * Query the time series
   * @param {Integer} range, number of hours to query back
   * @return {Promise} number of hits in time series query
   */
  countHits(range) {
    if (range == null) {
      range = 1;
    }
    // was `.then(_).call('size')` -- bluebird's .call(), which invoked a method
    // on the resolved value. Native promises have no such method.
    return this.query({ range }).then((results) => _.size(results));
  }
};
