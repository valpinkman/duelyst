/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Search for Matches
*/
const _ = require('underscore');
const util = require('util');
const Promise = require('bluebird');
const moment = require('moment');
const Errors = require('../../server/lib/custom_errors');
const Logger = require('../../app/common/logger');
const config = require('../../config/config.js');
const Consul = require('../../server/lib/consul');

const env = config.get('env');
const kue = require('kue');

// SDK
const GameType = require('../../app/sdk/gameType');
const RankFactory = require('../../app/sdk/rank/rankFactory');

// redis
const Redis = require('../../server/redis');
const { onType } = require('../../app/common/utils/utils_promise');

const rankedQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'ranked' });
const rankedDeckValueQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'ranked-deck-value' });

/**
 * 'getRequeueParams'
 * Returns a Promise with the parameters for re-creating
 * queue search jobs. Will pull the parameters from Consul
 * or provide defaults when Consul isn't enabled
 * @return {Promise} with parameters object
 */
const getRequeueParams = function () {
  // Defaults if Consul is disabled or fails
  const defaults = {
    searchRadiusIncrease: 1.0, // 0.34 is good
    rankedDeckRadiusIncrease: 2.0, // 0.0 - 0.5 is good
    maxRankRadius: 30, // 15 is good
    maxDeckValueRadius: 10,
    delayMs: 2000, // 5000 is good
    allowMatchWithLastOpponent: config.get('matchmaking.allowMatchWithLastOpponent'),
  };

  if (!config.get('consul.enabled')) {
    return Promise.resolve(defaults);
  }

  return Consul.kv.get(`environments/${process.env.NODE_ENV}/matchmaking-params.json`)
    .then(function (v) {
      let params = JSON.parse(v);
      params = _.extend(defaults, params);
      return params;
    }).catch((error) => // Just return the defaults if polling Consul fails
      defaults);
};

/**
 * 'requeueJob'
 * Puts a search for game job back on the queue
 * Logic to update searchRadius, delay, goes here
 * @param  {Object} job    Kue job
 */
const requeueJob = (job, done) => getRequeueParams()
  .then(function (params) {
  // Logger.module("MATCHMAKING-JOB").debug("[#{job.id}] getRequeueParams(): #{JSON.stringify(params)}")

    // Each attempt, we incease by parameters stored in Consul
    job.data.attempt++;
    job.data.searchRadius += params.searchRadiusIncrease;
    job.data.delayMs = params.delayMs;
    job.data.lastAttemptAt = Date.now();
    const firstMetric = job.data.rank;
    const secondMetric = job.data.deckValue;

    Logger.module('MATCHMAKING-JOB').debug(`[${job.id}] ${job.data.gameType.yellow} - \
Search for Game (${job.data.userId}) metric:${job.data.rank}(${firstMetric},${secondMetric}), \
attempt ${job.data.attempt}, \
delay ${job.data.delayMs}ms, \
searchRadius ${job.data.searchRadius}`,
    );

    // Recreate as new job with updated parameters (and delayed)
    return new Promise((resolve, reject) => Redis.Jobs.create('matchmaking-search-ranked', job.data)
      .then((v) => PromiseUtils.delay(job.data.delayMs, v))
      .removeOnComplete(true)
      .save(function (err) {
        if (err != null) {
          return reject(err);
        } else {
          return resolve();
        }
      }));
  }).then(() => done()).catch((error) => done(error));

/**
 * 'logMatchMade'
 * Logs that a match was made in the queue (used for wait time calculations)
 * @param  {Object} player 1's matchmaking token
 * @param  {Object} player 2's matchmaking token
 */
const logMatchMade = function (token1, token2) {
  let matchQuality;
  const now = Date.now();
  const waitTime1 = now - token1.createdAt;
  const waitTime2 = now - token2.createdAt;
  const rank1 = token1.rank;
  const rank2 = token2.rank;
  const deckValue1 = token1.deckValue;
  const deckValue2 = token2.deckValue;
  const division1 = __guard__(RankFactory.rankedDivisionAssetNameForRank(rank1), (x) => x.toLowerCase());
  const division2 = __guard__(RankFactory.rankedDivisionAssetNameForRank(rank2), (x1) => x1.toLowerCase());
  rankedQueue.matchMade(division1, waitTime1);
  rankedQueue.matchMade(division2, waitTime2);

  // calculate match quality
  let rankDelta = Math.abs((rank1 - rank2));
  rankDelta = Math.min(rankDelta, 5);
  let deckValueDelta = Math.abs((deckValue1 - deckValue2));
  deckValueDelta = Math.min(deckValueDelta, 5);
  return matchQuality = 1 - ((rankDelta + deckValueDelta) / 10);
};

/**
 * 'findLockablePlayer'
 * Find the first lockable player when provided with an array of player ids
 * Recursive calls itself until lock is found
 * Returns null if no lock found
 * @param {Array} player ids
 * @return {Object} lock, the locked player
 * @return {String} lock.id, the player's id
 * @return {Function} lock.unlock, the unlock function to call when done
 */
var findLockablePlayer = function (players) {
  if (players.length === 0) {
    return null;
  }

  return Redis.TokenManager.lock(players[0])
    .then(function (unlock) {
      if (_.isFunction(unlock)) {
        return { id: players[0], unlock };
      } else {
        players = players.slice(1);
        return findLockablePlayer(players);
      }
    });
};

/**
 * Searches the queue for list of potential opponents
 * Attempts to find lockable player
 * @param   {String}   userId         filters out from search results
 * @param   {String}   lastOpponentId     filters out from search results
 * @param   {Integer}   rank
 * @param   {Integer}   deckValue
 * @param   {Integer}   attempt
 * @param   {Date}    firstAttemptAt    first attempt time
 * @return   {Object}   lock         see 'findLockablePlayer'
 */
const findOpponent = (userId, lastOpponentId, rank, deckValue, attempt, firstAttemptAt) => {
  const _chainState = {};
  return getRequeueParams()
    .then(function (params) {
      _chainState.allowMatchWithLastOpponent = params.allowMatchWithLastOpponent;

      let scoreRadius = Math.floor(attempt * params.searchRadiusIncrease);
      scoreRadius = Math.min(scoreRadius, params.maxRankRadius);
      let deckValueRadius = (attempt % 6) + Math.floor(attempt / 3) + Math.floor(attempt * params.rankedDeckRadiusIncrease);
      deckValueRadius = Math.min(deckValueRadius, params.maxDeckValueRadius);

      // start to taper off the deck search radius at rank 20 to 15
      const taperStart = 20;
      const taperEnd = 15;
      if (rank < taperStart) {
        const delta = Math.max(0, rank - taperEnd);
        const taperVal = 10 - (10 * (delta / (taperStart - taperEnd)));
        // Logger.module("MATCHMAKING-JOB").debug("tapering deck limits by #{taperVal}")
        deckValueRadius = Math.floor(deckValueRadius + taperVal);
      }
      /*
  rankMin = Math.max(0,rank-scoreRadius)
  rankMax = Math.min(30,rank+scoreRadius)

  deckValueMin = Math.max(0,deckValue-deckValueRadius)
  deckValueMax = Math.min(10,deckValue+deckValueRadius)

  secondsPassed = moment.duration(Date.now() - firstAttemptAt).asSeconds()

  Logger.module("MATCHMAKING-JOB").debug("Searching score #{rankMin} - #{rankMax} ... deck #{deckValueMin} - #{deckValueMax}. #{secondsPassed}s so far.")
  */
      return Promise.all([
        rankedQueue.search({ score: rank, searchRadius: scoreRadius }),
        rankedDeckValueQueue.search({ score: deckValue, searchRadius: deckValueRadius }),
      ]);
    }).then(function ([playersWithinRank, playersWithinDeckValue]) {
      // exclude the user that's looking
      let rankPlayers = _.filter(playersWithinRank, (id) => id !== userId);
      let deckPlayers = _.filter(playersWithinDeckValue, (id) => id !== userId);

      // exclude last opponent
      if (!_chainState.allowMatchWithLastOpponent && lastOpponentId) {
        Logger.module('MATCHMAKING-JOB').debug(`excluding last opponent ${(lastOpponentId != null ? lastOpponentId.blue : undefined)}`);
        rankPlayers = _.filter(playersWithinRank, (id) => id !== lastOpponentId);
        deckPlayers = _.filter(playersWithinDeckValue, (id) => id !== lastOpponentId);
      }

      // players within both RANK and DECK VALUE
      const players = _.intersection(rankPlayers, deckPlayers);

      Logger.module('MATCHMAKING-JOB').debug(`found ${players.length} potential matches within range`);
      return findLockablePlayer(players);
    });
};

/**
 * Job - 'matchmaking-search-ranked'
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const userId = job.data.userId || null;
  if (!userId) {
    return done(new Error('User ID is not defined.'));
  }

  // Logger.module("MATCHMAKING-JOB").debug("[J:#{job.id}] Search for Game (#{userId})")

  // job data params
  // set defaults in none provided in initial job
  const gameType = job.data.gameType || GameType.Ranked;
  const delayMs = (job.data.delayMs = job.data.delayMs || 1000);
  const attempt = (job.data.attempt = job.data.attempt || 1);
  const firstAttemptAt = (job.data.firstAttemptAt = job.data.firstAttemptAt || Date.now());
  const lastAttemptAt = (job.data.lastAttemptAt = job.data.lastAttemptAt || Date.now());
  job.data.searchRadius = job.data.searchRadius || 0;
  const {
    tokenId,
  } = job.data;

  // 1a. check if player *this* player is still in queue, otherwise done()
  // 1b. check if player *this* player is locked by another job, otherwise requeue()
  // 1c. check if this job matches the matchmaking tokenId, otherwise die since it's an old job for a cancelled matchmaking request
  // 2.  attempt to acquire lock on player
  // 3.  search the queue for other players based on rank and search radius
  // 4.  if no results found, then requeueJob()
  // 5.  if opponent found, we have a lock on the opponent, retrieve opponent's tokens
  // 6.  remove the players from the queue (delete their placeholder in queue and clear their tokens)
  // 7.  create game with both player's tokens

  const isQueued = rankedQueue.isPlayerQueued(userId);
  const isLocked = Redis.TokenManager.isLocked(userId);

  // grab player token
  const playerToken = Redis.TokenManager.get(userId);

  return Promise.join(isQueued, isLocked, playerToken, function (isQueued, isLocked, playerToken) {
    if ((isQueued == null) || (playerToken == null)) {
      Logger.module('MATCHMAKING-JOB').debug(`[J:${job.id}] player (${userId}) is no longer queued (isQueued:${isQueued})`);
      return done(); // the player is no longer in queue
    }

    // save rank from player token in the job so the requeue method can use it
    const rank = (job.data.rank = parseInt(playerToken.rank));
    const {
      deckValue,
    } = job.data;

    if (isLocked) {
      Logger.module('MATCHMAKING-JOB').debug(`[J:${job.id}] player (${userId}) is locked (isLocked:${isLocked})`);
      return requeueJob(job, done); // the player is 'locked' by another job
    }

    if (playerToken.id !== tokenId) {
      Logger.module('MATCHMAKING-JOB').debug(`[J:${job.id}] this job's token ${tokenId} is outdated compared to ${playerToken.id}... killing job`);
      return done(); // looks like this job is for a token that has since been replaced
    }

    return Redis.TokenManager.lock(userId, 1000)
      .then(function (unlock) {
        if (!_.isFunction(unlock)) {
          Logger.module('MATCHMAKING-JOB').debug(`[J:${job.id}] lock(${userId}) acquire failed!`);
          return requeueJob(job, done);
        } else {
          Logger.module('MATCHMAKING-JOB').debug(`[J:${job.id}] lock(${userId}) acquired - matchmaking metric ${rank},${deckValue}. Last opponent: ${playerToken.lastOpponentId}.`);
          return findOpponent(userId, playerToken.lastOpponentId, rank, deckValue, attempt, firstAttemptAt)
            .then(function (opponent) {
              const _chainState = {};
              if (!opponent) {
                // no opponents found, unlock and requeue
                unlock();
                return requeueJob(job, done);
              } else {
                Logger.module('MATCHMAKING-JOB').debug(`[J:${job.id}] searchQueue(${userId}): ${JSON.stringify(opponent)}`);

                return Redis.TokenManager.get(opponent.id)
                  .then(function (opponentToken) { // TODO: We should validate results
                    // Logger.module("MATCHMAKING-JOB").debug("[J:#{job.id}] current ids: #{@token1} #{@token2}")

                    _chainState.token1 = playerToken;
                    _chainState.token2 = opponentToken;

                    if (!(_chainState.token1 != null ? _chainState.token1.userId : undefined)) {
                      Logger.module('MATCHMAKING-JOB').error(`[J:${job.id}] searchQueue(${userId}): ERROR: player token has no user id`);
                      throw new Errors.NotFoundError('player token has no user id');
                    }
                    if (!(_chainState.token2 != null ? _chainState.token2.userId : undefined)) {
                      Logger.module('MATCHMAKING-JOB').error(`[J:${job.id}] searchQueue(${userId}): ERROR: opponent token has no user id`);
                      throw new Errors.UnexpectedBadDataError('opponent token has no user id');
                    }

                    return Promise.all([
                      Redis.TokenManager.remove(_chainState.token1.userId),
                      Redis.TokenManager.remove(_chainState.token2.userId),
                      rankedQueue.remove([_chainState.token1.userId, _chainState.token2.userId]),
                      rankedDeckValueQueue.remove([_chainState.token1.userId, _chainState.token2.userId]),
                    ]);
                  }).then(function (results) { // TODO: We should validate results
                    // mark match made
                    logMatchMade(_chainState.token1, _chainState.token2);

                    // log it
                    Logger.module('MATCHMAKING-JOB').debug(`[J:${job.id}] ${gameType.yellow} - Search for Game (${userId}) done(), matched versus ${_chainState.token2.userId}`);
                    job.log('Matched versus %s(%s)', _chainState.token2.userId, _chainState.token2.name);

                    // Fire off job to setup game between both players
                    Redis.Jobs.create('matchmaking-setup-game', {
                      name: 'Matchmaking Setup Game',
                      title: util.format('Game :: Setup Game :: %s versus %s', _chainState.token1.name, _chainState.token2.name),
                      token1: _chainState.token1,
                      token2: _chainState.token2,
                      gameType,
                    }).removeOnComplete(true).save();

                    // We're done
                    return done(null, { opponentName: _chainState.token2.name });
                  })
                  .catch(onType(Errors.NotFoundError, (error) => done(error)))
                  .catch(onType(Errors.UnexpectedBadDataError, function (error) {
                    Logger.module('MATCHMAKING-JOB').debug(`[J:${job.id}] searchQueue(${userId}): removing opponent token ${opponent.id} due to error`);

                    // dangling async removal of potentially bad opponent data
                    Redis.TokenManager.remove(opponent.id);
                    rankedQueue.remove(opponent.id);
                    rankedDeckValueQueue.remove(opponent.id);

                    // manual unlock before requeue
                    unlock();

                    return requeueJob(job, done);
                  }));
              }
            });
        }
      });
  }).catch((error) => done(error));
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
