/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Search for Matches
*/
const _ = require('underscore');
const util = require('util');
const Errors = require('../../server/lib/custom_errors');
const Logger = require('../../app/common/logger');
const config = require('../../config/config.js');
const Consul = require('../../server/lib/consul');

const env = config.get('env');
const moment = require('moment');
const CONFIG = require('app/common/config');

// SDK
const GameType = require('@duelyst/sdk/gameType');
const RankFactory = require('@duelyst/sdk/rank/rankFactory');
const FactionsLookup = require('@duelyst/sdk/cards/factionsLookup');
const FactionFactory = require('@duelyst/sdk/cards/factionFactory');
const knex = require('server/lib/data_access/knex');

const createSinglePlayerGame = require('server/lib/create_single_player_game');

// redis
const Redis = require('../../server/redis');
const { onType } = require('../../app/common/utils/utils_promise');

const riftQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'rift' });

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
    riftSearchRadiusIncrease: 1,
    delayMs: 7000,
    allowMatchWithLastOpponent: config.get('matchmaking.allowMatchWithLastOpponent'),
  };

  if (!config.get('consul.enabled')) {
    return Promise.resolve(defaults);
  }

  return Consul.kv
    .get(`environments/${process.env.NODE_ENV}/matchmaking-rift-params.json`)
    .then(function (v) {
      let params = JSON.parse(v);
      params = _.extend(defaults, params);
      return params;
    })
    .catch(
      (error) =>
        // Just return the defaults if polling Consul fails
        defaults,
    );
};

/**
 * 'requeueJob'
 * Puts a search for game job back on the queue
 * Logic to update searchRadius, delay, goes here
 * @param  {Object} job    Kue job
 */
const requeueJob = (job, done) =>
  getRequeueParams()
    .then(function (params) {
      // Logger.module("MATCHMAKING-RIFT-JOB").log("[#{job.id}] RIFT - getRequeueParams(): #{JSON.stringify(params)}")

      // Each attempt, we incease by parameters stored in Consul
      job.data.attempt++;
      job.data.searchRadius += params.riftSearchRadiusIncrease;
      job.data.delayMs = params.delayMs;
      job.data.lastAttemptAt = Date.now();

      Logger.module('MATCHMAKING-RIFT-JOB').log(`[${job.id}] ${job.data.gameType.yellow} - \
Search for Game (${job.data.userId}) metric:(job.data.rank), \
attempt ${job.data.attempt}, \
delay ${job.data.delayMs}ms, \
searchRadius ${job.data.searchRadius}`);

      // Recreate as new job with updated parameters (and delayed)
      return Redis.Jobs.enqueue('matchmaking-search-rift', job.data, {
        delay: job.data.delayMs,
        removeOnComplete: true,
      });
    })
    .then(() => done())
    .catch((error) => done(error));

/**
 * 'logMatchMade'
 * Logs that a match was made in the queue (used for wait time calculations)
 * @param  {Object} player 1's matchmaking token
 * @param  {Object} player 2's matchmaking token
 */
const logMatchMade = function (token1, token2) {
  const now = Date.now();
  const waitTime1 = now - token1.createdAt;
  const waitTime2 = now - token2.createdAt;
  riftQueue.matchMade('rift', waitTime1);
  return riftQueue.matchMade('rift', waitTime2);
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

  return Redis.TokenManager.lock(players[0]).then(function (unlock) {
    if (_.isFunction(unlock)) {
      return { id: players[0], unlock };
    } else {
      players = players.slice(1);
      return findLockablePlayer(players);
    }
  });
};

/**
 * 'findOpponent'
 * Searches the queue for list of potential opponents
 * Attempts to find lockable player
 * @param   {String}   userId,       filters out from search results
 * @param   {String}   lastOpponentId     filters out from search results
 * @param   {Integer}   rank
 * @param   {Integer}   radius
 * @return   {Object} lock, see 'findLockablePlayer'
 */
const findOpponent = (userId, lastOpponentId, rank, radius) => {
  const _chainState: Record<string, any> = {};
  return getRequeueParams()
    .then(function (params) {
      _chainState.allowMatchWithLastOpponent = params.allowMatchWithLastOpponent;
      return riftQueue.search({ score: rank, searchRadius: radius });
    })
    .then(function (players) {
      // exclude the user that's looking
      players = _.filter(players, (id) => id !== userId);

      // exclude last opponent
      if (!_chainState.allowMatchWithLastOpponent && lastOpponentId) {
        Logger.module('MATCHMAKING-RIFT-JOB').debug(
          `excluding last opponent ${lastOpponentId != null ? lastOpponentId.blue : undefined}`,
        );
        players = _.filter(players, (id) => id !== lastOpponentId);
      }

      return findLockablePlayer(players);
    });
};

/**
 * Job - 'matchmaking-search-rift'
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const userId = job.data.userId || null;
  if (!userId) {
    return done(new Error('User ID is not defined.'));
  }

  // Logger.module("MATCHMAKING-RIFT-JOB").log("[J:#{job.id}] RIFT - Search for Game (#{userId})")

  // job data params
  // set defaults in none provided in initial job
  const gameType = job.data.gameType || GameType.Rift;
  const searchRadius = (job.data.searchRadius = job.data.searchRadius || 0);
  const delayMs = (job.data.delayMs = job.data.delayMs || 5000);
  const attempt = (job.data.attempt = job.data.attempt || 1);
  const firstAttemptAt = (job.data.firstAttemptAt = job.data.firstAttemptAt || Date.now());
  const lastAttemptAt = (job.data.lastAttemptAt = job.data.lastAttemptAt || Date.now());
  const { tokenId } = job.data;

  // 1a. check if player *this* player is still in queue, otherwise done()
  // 1b. check if player *this* player is locked by another job, otherwise requeue()
  // 1c. check if this job matches the matchmaking tokenId, otherwise die since it's an old job for a cancelled matchmaking request
  // 2.  attempt to acquire lock on player
  // 3.  search the queue for other players based on rank and search radius
  // 4.  if no results found, then requeueJob()
  // 5.  if opponent found, we have a lock on the opponent, retrieve opponent's tokens
  // 6.  remove the players from the queue (delete their placeholder in queue and clear their tokens)
  // 7.  create game with both player's tokens

  const isQueued = riftQueue.isPlayerQueued(userId);
  const isLocked = Redis.TokenManager.isLocked(userId);

  // grab player token
  const playerToken = Redis.TokenManager.get(userId);

  return Promise.all([isQueued, isLocked, playerToken])
    .then(function ([isQueued, isLocked, playerToken]) {
      if (isQueued == null || playerToken == null) {
        Logger.module('MATCHMAKING-RIFT-JOB').log(
          `[J:${job.id}] player (${userId}) is no longer queued (isQueued:${isQueued})`,
        );
        return done(); // the player is no longer in queue
      }

      // isQueued is actually their current rank in the queue
      // let's save it onto the job so the requeue method can use it
      const rank = (job.data.rank = parseInt(isQueued));

      if (isLocked) {
        Logger.module('MATCHMAKING-RIFT-JOB').log(
          `[J:${job.id}] player (${userId}) is locked (isLocked:${isLocked})`,
        );
        return requeueJob(job, done); // the player is 'locked' by another job
      }

      if (playerToken.id !== tokenId) {
        Logger.module('MATCHMAKING-RIFT-JOB').log(
          `[J:${job.id}] this job's token ${tokenId} is outdated compared to ${playerToken.id}... killing job`,
        );
        return done(); // looks like this job is for a token that has since been replaced
      }

      return Redis.TokenManager.lock(userId, 1000).then(function (unlock) {
        if (!_.isFunction(unlock)) {
          Logger.module('MATCHMAKING-RIFT-JOB').log(
            `[J:${job.id}] RIFT - lock(${userId}) acquire failed!`,
          );
          return requeueJob(job, done);
        } else {
          // Logger.module("MATCHMAKING-RIFT-JOB").log("[J:#{job.id}] RIFT - lock(#{userId}) acquired.")
          return findOpponent(userId, playerToken.lastOpponentId, rank, searchRadius).then(
            function (opponent) {
              const _chainState: Record<string, any> = {};
              if (!opponent) {
                // if we've waited 20 seconds, queue with a bot
                if (
                  moment.duration(moment.utc().valueOf() - firstAttemptAt.valueOf()).asSeconds() >
                  25
                ) {
                  return Promise.all([
                    Redis.TokenManager.remove(playerToken.userId),
                    riftQueue.remove([playerToken.userId]),
                  ])
                    .then(() =>
                      knex('users')
                        .where('is_bot', true)
                        .offset(knex.raw('floor(random()*110)'))
                        .first('id', 'username'),
                    )
                    .then(function (randomBotRow) {
                      _chainState.randomBotRow = randomBotRow;

                      // get random faction
                      const aiFactionId = _.sample([
                        FactionsLookup.Faction1,
                        FactionsLookup.Faction2,
                        FactionsLookup.Faction3,
                        FactionsLookup.Faction4,
                        FactionsLookup.Faction5,
                        FactionsLookup.Faction6,
                      ]);

                      // get random general from faction
                      const aiGeneralId = _.sample(
                        FactionFactory.generalIdsForFaction(aiFactionId),
                      );
                      const aiDifficulty = 1.0;

                      // bots should use around ~12 random cards
                      const aiNumRandomCards = Math.floor(CONFIG.MAX_DECK_SIZE * 0.3);

                      Logger.module('MATCHMAKING-RIFT-JOB').log(
                        `[J:${job.id}] ${gameType.yellow} - ${userId} has waited too long, matching with bot ${_chainState.randomBotRow.username}`,
                      );

                      const gameSetupOptions = {
                        player: {
                          riftRating: playerToken.riftRating,
                        },
                      };

                      // create game
                      return createSinglePlayerGame(
                        playerToken.userId,
                        playerToken.name,
                        gameType,
                        playerToken.deck,
                        playerToken.cardBackId,
                        playerToken.battleMapIndexes,
                        randomBotRow.id,
                        randomBotRow.username,
                        aiGeneralId,
                        null,
                        aiDifficulty,
                        aiNumRandomCards,
                        playerToken.ticketId,
                        gameSetupOptions,
                      );
                    })
                    .then(function () {
                      // We're done
                      return done(null, { opponentName: _chainState.randomBotRow.name });
                    });
                } else {
                  // no opponents found, unlock and requeue
                  unlock();
                  return requeueJob(job, done);
                }
              } else {
                Logger.module('MATCHMAKING-RIFT-JOB').log(
                  `[J:${job.id}] RIFT - searchQueue(${userId}): ${JSON.stringify(opponent)}`,
                );
                return Redis.TokenManager.get(opponent.id)
                  .then(function (opponentToken) {
                    // TODO: We should validate results
                    _chainState.token1 = playerToken;
                    _chainState.token2 = opponentToken;

                    if (!(_chainState.token1 != null ? _chainState.token1.userId : undefined)) {
                      Logger.module('MATCHMAKING-RIFT-JOB').log(
                        `[J:${job.id}] searchQueue(${userId}): ERROR: player token has no user id`,
                      );
                      throw new Errors.NotFoundError('player token has no user id');
                    }
                    if (!(_chainState.token2 != null ? _chainState.token2.userId : undefined)) {
                      Logger.module('MATCHMAKING-RIFT-JOB').log(
                        `[J:${job.id}] searchQueue(${userId}): ERROR: opponent token has no user id`,
                      );
                      throw new Errors.UnexpectedBadDataError('opponent token has no user id');
                    }

                    return Promise.all([
                      Redis.TokenManager.remove(_chainState.token1.userId),
                      Redis.TokenManager.remove(_chainState.token2.userId),
                      riftQueue.remove([_chainState.token1.userId, _chainState.token2.userId]),
                    ]);
                  })
                  .then(function (results) {
                    // TODO: We should validate results
                    // mark match made
                    logMatchMade(_chainState.token1, _chainState.token2);

                    // log it
                    Logger.module('MATCHMAKING-RIFT-JOB').log(
                      `[J:${job.id}] ${gameType.yellow} - Search for Game (${userId}) done(), matched versus ${_chainState.token2.userId}`,
                    );
                    job.log(
                      'Matched versus %s(%s)',
                      _chainState.token2.userId,
                      _chainState.token2.name,
                    );

                    // Fire off job to setup game between both players
                    Redis.Jobs.enqueue(
                      'matchmaking-setup-game',
                      {
                        name: 'Matchmaking Setup Game',
                        title: util.format(
                          'Game :: Setup Game :: %s versus %s',
                          _chainState.token1.name,
                          _chainState.token2.name,
                        ),
                        token1: _chainState.token1,
                        token2: _chainState.token2,
                        gameType,
                      },
                      { removeOnComplete: true },
                    );

                    // We're done
                    return done(null, { opponentName: _chainState.token2.name });
                  })
                  .catch(onType(Errors.NotFoundError, (error) => done(error)))
                  .catch(
                    onType(Errors.UnexpectedBadDataError, function (error) {
                      Logger.module('MATCHMAKING-RIFT-JOB').log(
                        `[J:${job.id}] searchQueue(${userId}): removing opponent token ${opponent.id} due to error`,
                      );

                      // dangling async removal of potentially bad opponent data
                      Redis.TokenManager.remove(opponent.id);
                      riftQueue.remove(opponent.id);

                      // manual unlock before requeue
                      unlock();

                      return requeueJob(job, done);
                    }),
                  );
              }
            },
          );
        }
      });
    })
    .catch((error) => done(error));
};
