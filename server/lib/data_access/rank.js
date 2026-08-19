/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Promise = require('bluebird');
const util = require('util');
const glicko2 = require('glicko2');

const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const Logger = require('../../../app/common/logger');
const colors = require('colors');
const moment = require('moment');
const _ = require('underscore');
const InventoryModule = require('./inventory');
const GamesModule = require('./games');
const SyncModule = require('./sync');
const Errors = require('../custom_errors');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');

// redis
const { Redis, Jobs, SRankManager } = require('../../redis');

// SDK imports
const SDK = require('../../../app/sdk');
const Cards = require('../../../app/sdk/cards/cardsLookupComplete');
const RankFactory = require('../../../app/sdk/rank/rankFactory');
const GameSession = require('../../../app/sdk/gameSession');
const UtilsGameSession = require('../../../app/common/utils/utils_game_session');
const CardFactory = require('../../../app/sdk/cards/cardFactory');
const Rarity = require('../../../app/sdk/cards/rarityLookup');

class RankModule {
  static initClass() {
    // Number of games required to get maximum win count based ladder rating value
    this._SRANK_WIN_COUNT_CEILING = 25;
  }

  /**
   * Checks if a user's ranking needs an update since the season reset.
   * @public
   * @param  {String}  userId    User ID for which to check rank season.
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will return BOOL for the result on completion.
   */
  static userNeedsSeasonStartRanking(userId, systemTime) {
    if (!userId) {
      return Promise.reject(new Error(`Can not check user ranking: invalid user ID - ${userId}`));
    }

    return knex.first('rank_starting_at').from('users').where('id', userId)
      .then(function (userRow) {
        if (RankModule._isSeasonTimestampExpired(userRow != null ? userRow.rank_starting_at : undefined, systemTime)) {
          return Promise.resolve(true);
        } else {
          return Promise.resolve(false);
        }
      });
  }

  /**
   * Check that if a new season has started since the provided UTC timestamp.
   * @private
   * @param  {Timestamp}  rank_started_at      The UTC timestamp that we want to check.
   * @param  {Moment}  systemTime        Pass in the current system time to override clock. Used mostly for testing.
   * @return  {BOOL}                Has a new season started since the argument timestamp?
   */
  static _isSeasonTimestampExpired(rank_started_at, systemTime) {
    if (rank_started_at != null) {
      const current_utc = systemTime || moment().utc();
      const current_month_val = (current_utc.year() * 100) + current_utc.month(); // formats to 201411 for 1/11/2014

      const rank_started_at_utc = moment.utc(rank_started_at);
      const rank_created_at_month_val = (rank_started_at_utc.year() * 100) + rank_started_at_utc.month(); // formats to 201411 for 1/11/2014

      return rank_created_at_month_val < current_month_val;
    } else {
      return true;
    }
  }

  /**
   * If needed, cycles rank season data for a user.
   * @public
   * @param  {String}  userId    User ID for which to cycle rank season.
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will return the rank data on completion.
   */
  static cycleUserSeasonRanking(userId, force, systemTime) {
    if (force == null) { force = false; }
    const MOMENT_UTC_NOW = systemTime || moment().utc();
    const MOMENT_UTC_START_OF_MONTH = MOMENT_UTC_NOW.clone().startOf('month');

    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not update user ranking: invalid user ID - ${userId}`));
    }

    const this_obj = {};

    var txPromise = knex.transaction((tx) => Promise.resolve(tx('users').where('id', userId).first().forUpdate())
      .bind(this_obj)
      .then(function (userRow) {
        this.userRow = userRow;

        if ((this.userRow != null ? this.userRow.rank_starting_at : undefined) != null) {
          this.startOfCycledSeasonMoment = moment.utc(this.userRow.rank_starting_at);
        }

        // if player is rank 0 update their ladder position data first
        if (((this.userRow != null ? this.userRow.rank : undefined) === 0) && ((this.userRow != null ? this.userRow.rank_starting_at : undefined) != null)) {
          return RankModule.updateAndGetUserLadderPosition(txPromise, tx, userId, this.startOfCycledSeasonMoment, MOMENT_UTC_NOW);
        } else {
          return Promise.resolve();
        }
      }).then(function () {
      // Get players rank ratings data
        return tx('user_rank_ratings').where('user_id', userId).andWhere('season_starting_at', this.userRow != null ? this.userRow.rank_starting_at : undefined).first()
          .forUpdate();
      })
      .then(function (userRatingRow) {
        this.userRatingRow = userRatingRow;

        this.oldRank = null;
        this.newRank = null;
        this.topRank = null;
        this.rankToReturn = null;

        // if we are not forcing an update and the season has not expired based on the current moment in time
        // then we want to return the current rank and do nothing
        if (!RankModule._isSeasonTimestampExpired(this.userRow != null ? this.userRow.rank_starting_at : undefined, MOMENT_UTC_NOW) && !force) {
          Logger.module('RankModule').debug(`cycleUserSeasonRanking() -> no need to cycle rank for ${moment.utc(this.userRow.rank_starting_at).format('MMMM YYYY')} season. user id: ${userId.blue}`);
          this.rankToReturn = {
            rank: this.userRow.rank,
            stars: this.userRow.rank_stars,
            stars_required: this.userRow.rank_stars_required,
            win_streak: this.userRow.rank_win_streak,
            delta: this.userRow.rank_delta,
            top_rank: this.userRow.rank_top_rank,

            starting_at: this.userRow.rank_starting_at,
            created_at: this.userRow.rank_created_at,
            updated_at: this.userRow.rank_updated_at,
            is_unread: this.userRow.rank_is_unread,
          };

          if (this.userRatingRow != null) {
            this.rankToReturn.rating = this.userRatingRow.rating;
            this.rankToReturn.top_rating = this.userRatingRow.top_rating;
            this.rankToReturn.ladder_position = this.userRow.rank_ladder_position;
          }

          return Promise.resolve();

          // otherwise we want to start the rank update process
        } else {
          let newRankData;
          const allQueries = [];

          // if we have a season rank and we're not forcing a reset, save the existing rank to history
          if ((this.userRow.rank_starting_at != null) && !force) {
            Logger.module('RankModule').debug(`cycleUserSeasonRanking() -> saving rank for ${moment.utc(this.userRow.rank_starting_at).format('MMMM YYYY')} season to history. user id: ${userId.blue}`);

            this.oldRank = {
              user_id: userId,
              created_at: this.userRow.rank_created_at,
              updated_at: this.userRow.rank_updated_at,
              starting_at: this.userRow.rank_starting_at,
              rank: this.userRow.rank,
              stars: this.userRow.rank_stars,
              stars_required: this.userRow.rank_stars_required,
              win_streak: this.userRow.rank_win_streak,
              top_rank: this.userRow.rank_top_rank,
              is_unread: true,
            };

            if (this.userRatingRow != null) {
              this.oldRank.rating = this.userRatingRow.rating;
              this.oldRank.top_rating = this.userRatingRow.top_rating;
              this.oldRank.ladder_position = this.userRatingRow.ladder_position;
              this.oldRank.top_ladder_position = this.userRatingRow.top_ladder_position;
              this.oldRank.ladder_rating = this.userRatingRow.ladder_rating;
              this.oldRank.srank_game_count = this.userRatingRow.srank_game_count;
              this.oldRank.srank_win_count = this.userRatingRow.srank_win_count;
            }

            allQueries.push(
              knex.insert(this.oldRank).into('user_rank_history').transacting(tx),
            );
          }

          Logger.module('RankModule').debug(`cycleUserSeasonRanking() -> generating rank for ${MOMENT_UTC_START_OF_MONTH.format('MMMM YYYY')} season. user id: ${userId.blue}`);

          // account for the bonus chevrons given as season rewards
          if ((this.oldRank != null ? this.oldRank.top_rank : undefined) != null) {
            newRankData = RankFactory.rankForNewSeason(this.oldRank != null ? this.oldRank.top_rank : undefined);
          } else {
            newRankData = {
              rank: 30,
              stars: 0,
            };
          }

          this.rankToReturn = (this.newRank = {
            rank: newRankData.rank,
            stars: newRankData.stars,
            stars_required: RankFactory.starsNeededToAdvanceRank(newRankData.rank),
            win_streak: 0,
            delta: null,
            top_rank: newRankData.rank,
            starting_at: MOMENT_UTC_START_OF_MONTH.toDate(),
            created_at: MOMENT_UTC_NOW.toDate(),
            updated_at: MOMENT_UTC_NOW.toDate(),
            is_unread: true,
          });

          const updatedExistingRankAttributes = {
            rank: this.newRank.rank,
            rank_starting_at: this.newRank.starting_at,
            rank_created_at: this.newRank.created_at,
            rank_updated_at: this.newRank.updated_at,
            rank_stars: this.newRank.stars,
            rank_stars_required: this.newRank.rank.stars_required,
            rank_delta: null,
            rank_win_streak: 0,
            rank_top_rank: this.newRank.rank,
            rank_is_unread: true,
          };

          // if we don't have a top rank or for some reason the top rank is better in the new season, set the new top rank
          // NOTE: specifically checking if the top rank improved is a bit redundant since the `updateUserRankingWithGame` method should take care of it after each game. However QA tools, scripts, etc might not account for it correctly so we do it here anyway.
          if (!this.userRow.top_rank_starting_at || (this.userRow.top_rank > this.newRank.rank)) {
            Logger.module('RankModule').debug(`cycleUserSeasonRanking() -> using the ${MOMENT_UTC_START_OF_MONTH.format('MMMM YYYY')} season rank as top rank. user id: ${userId.blue}`);
            this.topRank = this.newRank;

            updatedExistingRankAttributes.top_rank = this.newRank.rank;
            updatedExistingRankAttributes.top_rank_starting_at = this.newRank.starting_at;
            updatedExistingRankAttributes.top_rank_updated_at = this.newRank.updated_at;

            if ((this.userRatingRow != null ? this.userRatingRow.ladder_position : undefined) != null) {
              updatedExistingRankAttributes.top_rank_ladder_position = this.userRatingRow.ladder_position;
            }
          }

          // update the current user rank to the "default" for now
          allQueries.push(
            knex('users').where('id', userId).update(updatedExistingRankAttributes).transacting(tx),
          );

          return Promise.all(allQueries);
        }
      })
      .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
      .timeout(10000)
      .catch(Promise.TimeoutError, function (e) {
        Logger.module('RankModule').error(`cycleUserSeasonRanking() -> ERROR, operation timeout for u:${userId}`);
        throw e;
      }));

    return txPromise
      .bind(this_obj)
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (fbRootRef) {
        const allPromises = [];

        // save to rank history
        if (this.oldRank) {
          this.oldRank.created_at = moment.utc(this.oldRank.created_at).valueOf();
          this.oldRank.updated_at = moment.utc(this.oldRank.updated_at).valueOf();
          this.oldRank.starting_at = moment.utc(this.oldRank.starting_at).valueOf();
          delete this.oldRank.user_id;
          // save old rank to history
          allPromises.push(FirebasePromises.set(fbRootRef.child('user-ranking').child(userId).child('history').child(this.oldRank.starting_at), this.oldRank));
        }

        if (this.newRank) {
          this.newRank.created_at = moment.utc(this.newRank.created_at).valueOf();
          this.newRank.updated_at = moment.utc(this.newRank.updated_at).valueOf();
          this.newRank.starting_at = moment.utc(this.newRank.starting_at).valueOf();
          // save new rank
          allPromises.push(FirebasePromises.set(fbRootRef.child('user-ranking').child(userId).child('current'), this.newRank));
        }

        if (this.topRank) {
          this.topRank.created_at = moment.utc(this.topRank.created_at).valueOf();
          this.topRank.updated_at = moment.utc(this.topRank.updated_at).valueOf();
          this.topRank.starting_at = moment.utc(this.topRank.starting_at).valueOf();
          // save top rank
          allPromises.push(FirebasePromises.set(fbRootRef.child('user-ranking').child(userId).child('top'), this.topRank));
        }

        // Remove ladder position from presence
        allPromises.push(FirebasePromises.remove(fbRootRef.child('users').child(userId).child('presence').child('ladder_position')));

        return Promise.resolve(allPromises);
      }).then(function () {
        return Promise.resolve(this.rankToReturn);
      });
  }

  /**
   * Update a user's ranking based on the outcome of a ranked game
   * @public
   * @param  {String}  userId    User ID for which to update.
   * @param  {Boolean}  isWinner  Did the user win the game?
   * @param  {String}  gameId    Game unique ID
   * @param  {Boolean}  isDraw    Are we updating for a draw?
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will post a RANK DATA.
   */
  static updateUserRankingWithGameOutcome(userId, isWinner, gameId, isDraw, systemTime) {
    const MOMENT_UTC_NOW = systemTime || moment().utc();

    // userId must be defined
    if (!userId) {
      return Promise.reject(new Error(`Can not updateUserRankingWithGame(): invalid user ID - ${userId}`));
    }

    const this_obj = {};
    this_obj.timeout = setTimeout(() => Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> Potential timeout detected. game_id:${gameId}`),
      10000);

    return knex.transaction((tx) => Promise.resolve(tx('users').first().where('id', userId).forUpdate())
      .bind(this_obj)
      .then(function (userRow) {
      // Logger.module("RankModule").debug "updateUserRankingWithGameOutcome() -> ACQUIRED LOCK ON #{userId}".yellow

        this.userRow = userRow;

        let rankData = {
          rank: userRow.rank,
          created_at: userRow.rank_created_at,
          starting_at: userRow.rank_starting_at,
          updated_at: userRow.rank_updated_at,
          stars: userRow.rank_stars,
          delta: userRow.rank_delta,
          stars_required: userRow.rank_stars_required,
          win_streak: userRow.rank_win_streak,
          top_rank: userRow.rank_top_rank,
          is_unread: true,
        };

        // for bot users, always count games as DRAWs for purposes of rank calculation
        if (userRow.is_bot) {
          Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> No need for BOT ranking user ${userId}`);
          rankData = (this.rankData = RankFactory.updateRankDataWithGameOutcome(rankData, false, true));
          // otherwise normal processing
        } else {
          rankData = (this.rankData = RankFactory.updateRankDataWithGameOutcome(rankData, isWinner, isDraw));
        }

        this.topRankUpdated = false;

        const allQueries = [];

        const updateParams = {
          rank_updated_at: MOMENT_UTC_NOW.toDate(),
          rank: rankData.rank,
          rank_stars: rankData.stars,
          rank_delta: rankData.delta,
          rank_win_streak: rankData.win_streak,
          rank_top_rank: rankData.top_rank,
          rank_is_unread: true,
        };

        if (rankData.rank < userRow.top_rank) {
          this.topRankUpdated = true;
          updateParams.top_rank = rankData.rank;
          updateParams.top_rank_starting_at = userRow.rank_starting_at;
          updateParams.top_rank_updated_at = MOMENT_UTC_NOW.toDate();

          // if a user has hit a new division level, we need to update REFERRAL system
          if (userRow.referred_by_user_id && (RankFactory.rankedDivisionAssetNameForRank(rankData.rank) !== RankFactory.rankedDivisionAssetNameForRank(userRow.top_rank))) {
            const eventType = RankFactory.rankedDivisionAssetNameForRank(rankData.rank);

            // kick off a job to process this referral event
            Jobs.create('process-user-referral-event', {
              name: 'Process User Referral Event',
              title: util.format('User %s :: Generated Referral Event %s', userId, eventType),
              userId,
              eventType,
              achievedRank: rankData.rank,
              referrerId: userRow.referred_by_user_id,
            },
            ).removeOnComplete(true).ttl(15000).save();
          }
        }

        // log stars change
        if (rankData.delta.stars || rankData.delta.rank || (rankData.rank === 0)) {
          allQueries.push(knex.insert({
            id: generatePushId(),
            user_id: userId,
            game_id: gameId,
            stars: rankData.delta.stars,
            rank: rankData.delta.rank,
            starting_at: userRow.rank_starting_at,
          }).into('user_rank_events').transacting(tx).then(() => Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> user_rank_events DONE. game_id:${gameId}`)),
          );
        }

        allQueries.push(knex('user_games').where({ user_id: userId, game_id: gameId }).update({
          rank_before: userRow.rank,
          rank_stars_before: userRow.rank_stars,
          rank_delta: rankData.delta.rank,
          rank_stars_delta: rankData.delta.stars,
          rank_win_streak: rankData.win_streak,
        }).transacting(tx)
          .then(() => Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> user_games DONE. game_id:${gameId}`)),
        );

        allQueries.push(knex('users').where('id', userId).update(updateParams).transacting(tx)
          .then(() => Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> users DONE. game_id:${gameId}`)),
        );

        Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> processing game and user objects. game_id:${gameId}`);

        return Promise.all(allQueries);
      }).then(() => DuelystFirebase.connect().getRootRef())
      .then(function (fbRootRef) {
        Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> saving firebase data. game_id:${gameId}`);
        this.fbRootRef = fbRootRef;
        const allPromises = [];

        const data = this.rankData;

        // transform dates to int timestamps for firebase
        if (data.created_at) { data.created_at = moment.utc(data.created_at).valueOf(); }
        if (data.starting_at) { data.starting_at = moment.utc(data.starting_at).valueOf(); }
        if (data.updated_at) { data.updated_at = moment.utc(data.updated_at).valueOf(); }

        if (this.topRankUpdated) {
          allPromises.push(FirebasePromises.set(fbRootRef.child('user-ranking').child(userId).child('top'), data));
        }

        allPromises.push(FirebasePromises.set(fbRootRef.child('user-ranking').child(userId).child('current'), data));

        // update game record
        allPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rank_before'), this.userRow.rank));
        allPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rank_stars_before'), this.userRow.rank_stars));
        allPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rank_delta'), this.rankData.delta.rank));
        allPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rank_stars_delta'), this.rankData.delta.stars));
        allPromises.push(FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('rank_win_streak'), this.rankData.win_streak));

        return Promise.all(allPromises);
      })
      .then(function () {
        Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> FB done. syncing user tx counts. game_id:${gameId}`);
        return SyncModule._bumpUserTransactionCounter(tx, userId);
      })
      .timeout(10000)
      .catch(Promise.TimeoutError, function (e) {
        Logger.module('RankModule').error(`updateUserRankingWithGameOutcome() -> ERROR, operation timeout for u:${userId} g:${gameId}`);
        throw e;
      })
      .finally(() => DuelystFirebase.connect().getRootRef()
        .then((fbRootRef) => FirebasePromises.set(fbRootRef.child('user-games').child(userId).child(gameId).child('job_status')
          .child('rank'), true)))).bind(this_obj)
      .then(function () {
        clearTimeout(this.timeout);
        Logger.module('RankModule').debug(`updateUserRankingWithGameOutcome() -> All DONE. user_id: ${userId} game_id:${gameId}`);

        // If user earned higher rank, update rank achievements
        if (this.rankData.delta.rank < 0) {
          Jobs.create('update-user-achievements', {
            name: 'Update User Rank Achievements',
            title: util.format('User %s :: Update Rank Achievements', userId),
            userId,
            achievedRank: this.rankData.rank,
          },
          ).removeOnComplete(true).ttl(15000).save();
        }

        return Promise.resolve(this.rankData);
      }).finally(() => GamesModule.markClientGameJobStatusAsComplete(userId, gameId, 'quests'));
  }

  /**
   * Update 2 users' rating based on the outcome of a ranked game
   * @public
   * @param  {String}  player1Id    User ID for which to update.
   * @param  {String}  player2Id    User ID for which to update.
   * @param  {Boolean}  player1IsWinner  Did player 1 win the game?
   * @param  {String}  gameId    Game unique ID
   * @param  {Boolean}  isDraw    Are we updating for a draw?
   * @param  {Boolean}  player1IsRanked    Whether or not player 1 was queued for rank - if false they were casual
   * @param  {Boolean}  player2IsRanked    Whether or not player 1 was queued for rank - if false they were casual
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will post a RANK DATA.
   */
  static updateUsersRatingsWithGameOutcome(player1Id, player2Id, player1IsWinner, gameId, isDraw, player1IsRanked, player2IsRanked, systemTime) {
    Logger.module('RankModule').debug(`updateUsersRatingsWithGameOutcome() -> updating for users[${player1Id},${player2Id}] game_id:${gameId}`);

    const MOMENT_UTC_NOW = systemTime || moment().utc();

    const player2IsWinner = !isDraw && !player1IsWinner;

    const this_obj = {
      player1Id,
      player2Id,
      gameId,
    };

    this_obj.timeout = setTimeout(() => Logger.module('RankModule').debug(`updateUsersRatingsWithGameOutcome() -> Potential timeout detected. game_id:${gameId}`),
      10000);

    const startOfSeasonMoment = moment(MOMENT_UTC_NOW).startOf('month');
    const seasonStartingAt = startOfSeasonMoment.toDate();
    this_obj.startOfSeasonMoment = startOfSeasonMoment;
    this_obj.seasonStartingAt = seasonStartingAt;

    // Transaction for updating player ratings (Ladder position in following)
    var txPromise = knex.transaction((tx) => Promise.all([
      tx('users').first('rank', 'top_rank_rating').where('id', player1Id).forUpdate(),
      tx('users').first('rank', 'top_rank_rating').where('id', player2Id).forUpdate(),
    ])
      .bind(this_obj)
      .spread((player1UserRow, player2UserRow) => Promise.all([
        player1UserRow,
        tx('user_rank_ratings').first().where({ user_id: player1Id, season_starting_at: seasonStartingAt }).forUpdate(),
        player2UserRow,
        tx('user_rank_ratings').first().where({ user_id: player2Id, season_starting_at: seasonStartingAt }).forUpdate(),
      ])).spread(function (player1UserRow, player1RatingRow, player2UserRow, player2RatingRow) {
        this.player1UserRow = player1UserRow;
        this.player1RatingRow = player1RatingRow;
        this.player2UserRow = player2UserRow;
        this.player2RatingRow = player2RatingRow;

        this.player1IsSRank = ((this.player1UserRow != null ? this.player1UserRow.rank : undefined) === 0) && player1IsRanked;
        this.player2IsSRank = ((this.player2UserRow != null ? this.player2UserRow.rank : undefined) === 0) && player2IsRanked;

        this.player1IsDiamondOrBetter = ((this.player1UserRow != null ? this.player1UserRow.rank : undefined) != null) && (this.player1UserRow.rank <= 5) && player1IsRanked;
        this.player2IsDiamondOrBetter = ((this.player2UserRow != null ? this.player2UserRow.rank : undefined) != null) && (this.player2UserRow.rank <= 5) && player1IsRanked;

        this.trackRatingForPlayer1 = ((this.player1UserRow != null ? this.player1UserRow.rank : undefined) <= 5) && player1IsRanked;
        this.trackRatingForPlayer2 = ((this.player2UserRow != null ? this.player2UserRow.rank : undefined) <= 5) && player2IsRanked;

        const allPromises = [];

        // Our glicko settings
        const glickoSettings = {
          min_rating: 100,
          max_rating: 5000,
          default_rating: 1500,
        };

        // Glicko init options
        const glickoConfig = {
          tau: 0.5,
          rating: glickoSettings.default_rating,
          rd: 200,
          vol: 0.06,
        };
        // create glicko environment
        const ranking = new glicko2.Glicko2(glickoConfig);

        let player1DefaultRating = 1500;
        let player2DefaultRating = 1500;

        // If an s-rank player wins against a non s-rank player, count the non s-rank player as rating 900 to dampen how much the win counts
        if (player1IsWinner && !this.player1IsDiamondOrBetter) {
          player2DefaultRating = 900;
        }
        if (player2IsWinner && !this.player2IsDiamondOrBetter) {
          player1DefaultRating = 900;
        }

        // Set up default rating data
        const player1RatingData = {
          rating: (this.player1RatingRow != null ? this.player1RatingRow.rating : undefined) || player1DefaultRating,
          rating_deviation: (this.player1RatingRow != null ? this.player1RatingRow.rating_deviation : undefined) || 200,
          volatility: (this.player1RatingRow != null ? this.player1RatingRow.volatility : undefined) || 0.06,
        };

        const player2RatingData = {
          rating: (this.player2RatingRow != null ? this.player2RatingRow.rating : undefined) || player2DefaultRating,
          rating_deviation: (this.player2RatingRow != null ? this.player2RatingRow.rating_deviation : undefined) || 200,
          volatility: (this.player2RatingRow != null ? this.player2RatingRow.volatility : undefined) || 0.06,
        };

        const player1 = ranking.makePlayer(player1RatingData.rating, player1RatingData.rating_deviation, player1RatingData.volatility);
        const player2 = ranking.makePlayer(player2RatingData.rating, player2RatingData.rating_deviation, player2RatingData.volatility);

        let outcome = 0;
        if (isDraw) {
          outcome = 0.5;
        } else if (player1IsWinner) {
          outcome = 1;
        }

        ranking.updateRatings([[player1, player2, outcome]]);

        // Now update database with new ratings data
        const updateOrInsertUserRating = (userId, userRow, userRatingRow, glickoPlayerData, gameId, isWinner, dataTarget) => {
        // Round rating for integer storage
          let newRating = Math.round(glickoPlayerData.getRating());
          // Lower bound for rating
          newRating = Math.max(newRating, glickoSettings.min_rating);
          // Upper bound for rating
          newRating = Math.min(newRating, glickoSettings.max_rating);

          const oldRating = (userRatingRow != null ? userRatingRow.rating : undefined) || 1500;

          const ratingDelta = newRating - ((userRatingRow != null ? userRatingRow.rating : undefined) || glickoSettings.default_rating);

          let gameCount = (userRatingRow != null ? userRatingRow.srank_game_count : undefined) || 0;
          let winCount = (userRatingRow != null ? userRatingRow.srank_win_count : undefined) || 0;

          let rank = userRow != null ? userRow.rank : undefined;
          if ((rank == null)) {
            rank = 30;
          }

          if (rank === 0) {
            gameCount = ((userRatingRow != null ? userRatingRow.srank_game_count : undefined) || 0) + 1;
            if (isWinner) {
              winCount = ((userRatingRow != null ? userRatingRow.srank_win_count : undefined) || 0) + 1;
            }
          }

          let ladderRating = null;
          if (rank === 0) {
            ladderRating = RankModule._ladderRatingForRatingAndWinCount(newRating, winCount);
            dataTarget.new_ladder_rating = ladderRating;
          }

          if (userRatingRow != null) {
          // Rating row exists, update the current data
            const topRating = Math.max(newRating, userRatingRow.top_rating || 0);
            allPromises.push(tx('user_rank_ratings').where({ user_id: userId, season_starting_at: this.seasonStartingAt }).update({
              ladder_rating: ladderRating,
              rating: newRating,
              rating_deviation: glickoPlayerData.getRd(),
              srank_game_count: gameCount,
              srank_win_count: winCount,
              top_rating: topRating,
              volatility: glickoPlayerData.getVol(),
              updated_at: MOMENT_UTC_NOW.toDate(),
            }),
            );
          } else {
          // Rating row doesn't yet exist, insert a new one
            allPromises.push(tx('user_rank_ratings').insert({
              user_id: userId,
              ladder_rating: ladderRating,
              rating: newRating,
              rating_deviation: glickoPlayerData.getRd(),
              season_starting_at: this.seasonStartingAt,
              srank_game_count: gameCount,
              srank_win_count: winCount,
              top_rating: newRating,
              volatility: glickoPlayerData.getVol(),
              created_at: MOMENT_UTC_NOW.toDate(),
              updated_at: MOMENT_UTC_NOW.toDate(),
            }),
            );
          }

          // Update rating delta data in user_games table
          allPromises.push(tx('user_rank_events').where({ user_id: userId, game_id: gameId }).update({
            rating: oldRating,
            rating_delta: ratingDelta,
          }),
          );

          // Update rating delta data in user_rank_history table
          allPromises.push(tx('user_games').where({ user_id: userId, game_id: gameId }).update({
            rating: oldRating,
            rating_delta: ratingDelta,
          }),
          );

          // Check if we need to update highest srank rating (Important! Unlike top_rank_ladder_position this is not attached to a season, top season is based on ladder position)
          // This is stored for analytis purposes and a user would care more about the season they visibly performed the best
          if ((userRow.top_rank_rating == null) || (newRating > userRow.top_rank_rating)) {
            return allPromises.push(tx('users').where({ id: userId }).update({
              top_rank_rating: newRating,
            }),
            );
          }
        };

        // No rating is tracked if either player is not diamond or better
        if (this.player1IsDiamondOrBetter && this.player2IsDiamondOrBetter) {
          if (this.trackRatingForPlayer1) {
            this.player1NewRatingData = {};
            updateOrInsertUserRating(this.player1Id, this.player1UserRow, this.player1RatingRow, player1, gameId, player1IsWinner, this.player1NewRatingData);
          }

          if (this.trackRatingForPlayer2) {
            this.player2NewRatingData = {};
            updateOrInsertUserRating(this.player2Id, this.player2UserRow, this.player2RatingRow, player2, gameId, player2IsWinner, this.player2NewRatingData);
          }
        }

        return Promise.all(allPromises);
      })
      .then(function () {
      // Update rating in redis
        const redisPromises = [];
        if ((this.player1NewRatingData != null) && (this.player1NewRatingData.new_ladder_rating != null) && this.player1IsSRank) {
          redisPromises.push(SRankManager.updateUserLadderRating(this.player1Id, this.startOfSeasonMoment, this.player1NewRatingData.new_ladder_rating));
        }

        if ((this.player2NewRatingData != null) && (this.player2NewRatingData.new_ladder_rating != null) && this.player2IsSRank) {
          redisPromises.push(SRankManager.updateUserLadderRating(this.player2Id, this.startOfSeasonMoment, this.player2NewRatingData.new_ladder_rating));
        }

        return Promise.all(redisPromises);
      })
      .then(function () {
      // Computer players current position in the ladder
        const ladderRankingPromises = [];

        if (this.player1IsSRank) {
          ladderRankingPromises.push(RankModule.updateAndGetUserLadderPosition(txPromise, tx, this.player1Id, this.startOfSeasonMoment, false, MOMENT_UTC_NOW));
        } else {
          ladderRankingPromises.push(Promise.resolve(null));
        }

        if (this.player2IsSRank) {
          ladderRankingPromises.push(RankModule.updateAndGetUserLadderPosition(txPromise, tx, this.player2Id, this.startOfSeasonMoment, false, MOMENT_UTC_NOW));
        } else {
          ladderRankingPromises.push(Promise.resolve(null));
        }

        return Promise.all(ladderRankingPromises)
          .bind(this_obj)
          .spread(function (player1LadderPositionAfter, player2LadderPositionAfter) {
            this.player1LadderPositionAfter = player1LadderPositionAfter;
            return this.player2LadderPositionAfter = player2LadderPositionAfter;
          });
      })
      .timeout(10000)
      .catch(Promise.TimeoutError, function (e) {
        Logger.module('RankModule').error(`updateUsersRatingsWithGameOutcome() -> ERROR, operation timeout for u:${userId} g:${gameId}`);
        throw e;
      })).bind(this_obj)
      .then(() => DuelystFirebase.connect().getRootRef())
      .then(function (fbRootRef) {
      // Perform firebase updates now that transaction is completed
        this.fbRootRef = fbRootRef;

        const fbUpdatePromises = [];

        // if players had a ladder position before add it to game over data
        if ((this.player1RatingRow != null ? this.player1RatingRow.ladder_position : undefined) != null) {
          fbUpdatePromises.push(FirebasePromises.set(this.fbRootRef.child('user-games').child(this.player1Id).child(this.gameId).child('ladder_position_before'), this.player1RatingRow.ladder_position));
        }
        if ((this.player2RatingRow != null ? this.player2RatingRow.ladder_position : undefined) != null) {
          fbUpdatePromises.push(FirebasePromises.set(this.fbRootRef.child('user-games').child(this.player2Id).child(this.gameId).child('ladder_position_before'), this.player2RatingRow.ladder_position));
        }

        // If players have a new ladder position after match add it to game over data
        if (this.player1LadderPositionAfter) {
          fbUpdatePromises.push(FirebasePromises.set(this.fbRootRef.child('user-games').child(this.player1Id).child(this.gameId).child('ladder_position_after'), this.player1LadderPositionAfter));
        }
        if (this.player2LadderPositionAfter) {
          fbUpdatePromises.push(FirebasePromises.set(this.fbRootRef.child('user-games').child(this.player2Id).child(this.gameId).child('ladder_position_after'), this.player2LadderPositionAfter));
        }

        return Promise.all(fbUpdatePromises);
      })
      .then(function () {
        clearTimeout(this.timeout);
        return Promise.resolve();
      })
      .finally(function () {
        return Promise.all([
          GamesModule.markClientGameJobStatusAsComplete(this.player1Id, this.gameId, 'ladder'),
          GamesModule.markClientGameJobStatusAsComplete(this.player2Id, this.gameId, 'ladder'),
        ]);
      });

    return txPromise;
  }

  /**
   * Helper method to calculate a user's ladder rating based on raw glicko rating and win count
   * @public
   * @param  {Integer}  rawRating Glicko rating of user
   * @param  {Integer}  sRankWinCount  Number of S-Rank wins user has
   * @return  {Integer}  User's ladder rating
   */
  static _ladderRatingForRatingAndWinCount(rawRating, sRankWinCount) {
    const consideredWinCount = Math.min(sRankWinCount, RankModule._SRANK_WIN_COUNT_CEILING);
    const winCountScale = Math.log(consideredWinCount + 1) / Math.log(RankModule._SRANK_WIN_COUNT_CEILING + 1);
    const ladderRating = Math.round((0.6 * rawRating) + (0.4 * rawRating * winCountScale));
    return ladderRating;
  }

  /**
   * Helper method to retrieve a users rating row based on system time
   * @public
   * @param  {KNEX.Transaction}  tx  KNEX Transaction to attach the operation to.
   * @param  {String}  playerId    User ID to retrieve data for
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will return the ratings data row on completion.
   */
  static getUserRatingData(tx, playerId, systemTime) {
    const MOMENT_UTC_NOW = systemTime || moment().utc();
    const startOfSeasonMoment = moment(MOMENT_UTC_NOW).utc().startOf('month');
    const seasonStartingAt = startOfSeasonMoment.toDate();
    return tx('user_rank_ratings').first().where({ user_id: playerId, season_starting_at: seasonStartingAt });
  }

  /**
   * Updates and returns a users ladder position
   * @public
   * @param  {Promise}    trxPromise  Transaction promise that resolves if transaction succeeds.
   * @param  {KNEX.Transaction}      tx  KNEX Transaction to attach the operation to.
   * @param  {String}  playerId    User ID to retrieve data for
   * @param  {Moment}  startOfSeasonMoment  (optional) Pass in the moment for the start of the season, defaults to current season
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will return the users updated ladder position
   */
  static updateAndGetUserLadderPosition(txPromise, tx, playerId, startOfSeasonMoment, systemTime) {
    const MOMENT_UTC_NOW = systemTime || moment().utc();
    startOfSeasonMoment = moment.utc(startOfSeasonMoment || MOMENT_UTC_NOW).startOf('month');
    const seasonStartingAt = startOfSeasonMoment.toDate();

    const this_obj = {};
    this_obj.seasonStartingAt = seasonStartingAt;

    // First retrieves the current ladder position to determine if updates are needed to top ladder position
    return this.getUserLadderPosition(tx, playerId, startOfSeasonMoment, true, MOMENT_UTC_NOW)
      .bind(this_obj)
      .then(function (ladderPosition) {
        this.newLadderPosition = ladderPosition;
        if ((ladderPosition == null)) {
        // No ladder position, clear any current data for this season
          txPromise.then(() => DuelystFirebase.connect().getRootRef()
            .then((fbRootRef) => Promise.all([
              FirebasePromises.remove(fbRootRef.child('users').child(playerId).child('presence').child('ladder_position')),
            ])));
          return ladderPosition;
        } else {
          return Promise.all([
            tx('users').first('top_rank_ladder_position').where('id', playerId).forUpdate(),
            tx('user_rank_ratings').first('top_ladder_position').where({ user_id: playerId, season_starting_at: seasonStartingAt }).forUpdate(),

          ])
            .bind(this_obj)
            .spread(function (userRowData, userRatingRowData) {
              const allPromises = [];

              const fbUserRatingData = {
                ladder_position: this.newLadderPosition,
                updated_at: MOMENT_UTC_NOW.valueOf(),
              };

              // Place data in fb for storage after the transaction has completed
              txPromise.then(() => DuelystFirebase.connect().getRootRef()
                .then((fbRootRef) => Promise.all([
                  FirebasePromises.set(fbRootRef.child('user-ladder-position').child(startOfSeasonMoment.valueOf()).child(playerId), fbUserRatingData),
                  FirebasePromises.set(fbRootRef.child('users').child(playerId).child('presence').child('ladder_position'), ladderPosition),
                ])));

              // Update the current user rating row for this season with ladder position
              const topLadderPosition = Math.min(this.newLadderPosition, (userRatingRowData != null ? userRatingRowData.top_ladder_position : undefined) || this.newLadderPosition);
              const userRatingRowLadderPositionData = {
                ladder_position: this.newLadderPosition,
                top_ladder_position: topLadderPosition,
                updated_at: MOMENT_UTC_NOW.toDate(),
              };
              allPromises.push(tx('user_rank_ratings').where('user_id', playerId).andWhere('season_starting_at', this.seasonStartingAt).update(userRatingRowLadderPositionData));

              // Check if we need to update top ranks based on ladder position
              if ((userRowData.top_rank_ladder_position == null) || (this.newLadderPosition < userRowData.top_rank_ladder_position)) {
                const userRowLadderPositionData = {};
                userRowLadderPositionData.top_rank_starting_at = this.seasonStartingAt;
                userRowLadderPositionData.top_rank_updated_at = MOMENT_UTC_NOW.toDate();
                userRowLadderPositionData.top_rank_ladder_position = this.newLadderPosition;

                const fbUserTopRankData = {
                  ladder_position: this.newLadderPosition,
                  top_ladder_position: this.newLadderPosition,
                  starting_at: moment.utc(this.seasonStartingAt).valueOf(),
                  updated_at: MOMENT_UTC_NOW.valueOf(),
                  is_unread: true,
                };

                txPromise.then(() => DuelystFirebase.connect().getRootRef()).then((fbRootRef) => FirebasePromises.update(fbRootRef.child('user-ranking').child(playerId).child('top'), fbUserTopRankData));

                // Update top season in user row
                allPromises.push(tx('users').where('id', playerId).update(userRowLadderPositionData));
              }

              return Promise.all(allPromises);
            });
        }
      }).bind(this_obj)
      .then(function () {
        return this.newLadderPosition;
      });
  }

  /**
   * Retrieves the cached ladder position of a player from database
   * Calculated by counting how many players have a higher rating for this season than the player provided
   * @public
   * @param  {KNEX.Transaction}      tx  KNEX Transaction to attach the operation to.
   * @param  {String}  playerId    User ID to retrieve data for
   * @param  {Moment}  startOfSeasonMoment  (optional) Pass in the moment for the start of the season, defaults to current season
   * @param  {Boolean}  recalculateIfOldSeason  (optional) Defaults to false, if false returns cached ladder position, else performs count on db
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will return the users cached ladder position or null if none exists
   */
  static getUserLadderPosition(tx, playerId, startOfSeasonMoment, recalculateIfOldSeason, systemTime) {
    const MOMENT_UTC_NOW = systemTime || moment().utc();
    startOfSeasonMoment = moment.utc(startOfSeasonMoment || MOMENT_UTC_NOW).startOf('month');
    const seasonStartingAt = startOfSeasonMoment.toDate();

    if (recalculateIfOldSeason == null) { recalculateIfOldSeason = false; }

    return this.getUserRatingData(tx, playerId, MOMENT_UTC_NOW)
      .bind(({}))
      .then(function (userRatingRow) {
        this.userRatingRow = userRatingRow;
        if ((this.userRatingRow != null ? this.userRatingRow.rating : undefined) != null) {
          if (SRankManager.getSeasonIsStillActiveInRedis(startOfSeasonMoment, systemTime)) {
            return SRankManager.getUserLadderPosition(playerId, startOfSeasonMoment);
          } else {
            if (recalculateIfOldSeason) {
              return tx('user_rank_ratings').count().where('season_starting_at', seasonStartingAt).andWhere('ladder_rating', '>', this.userRatingRow.ladder_rating)
                .then(function (countData) {
                  if (countData != null) {
                    return Promise.resolve(parseInt(countData[0].count) + 1);
                  } else {
                    return Promise.resolve(null);
                  }
                });
            } else {
            // Use cached value
              return Promise.resolve(this.userRatingRow.ladder_position);
            }
          }
        } else {
        // If they have no rating data assume they are new to s-rank
          return Promise.resolve(null);
        }
      }).then(function (ladderPosition) {
        if (ladderPosition != null) {
          this.ladderPosition = parseInt(ladderPosition);
          return this.ladderPosition;
        } else {
          return null;
        }
      });
  }

  /**
   * Get a user's current season rank.
   * @public
   * @param  {String}  userId    User ID.
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will return INT rank on completion.
   */
  static getCurrentSeasonRank(userId, systemTime) {
    if (!userId) {
      return Promise.reject(new Error(`Can not get user rank: invalid user ID - ${userId}`));
    }

    return knex('users').first('rank', 'rank_starting_at').where('id', userId)
      .then(function (rankData) {
        if (RankModule._isSeasonTimestampExpired(rankData != null ? rankData.rank_starting_at : undefined, systemTime)) {
          return 30;
        } else {
          return rankData.rank;
        }
      });
  }

  /**
   * Get a user's current season total number of stars.
   * @public
   * @param  {String}  userId    User ID.
   * @param  {Moment}  systemTime  Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}        Promise that will return stars count {Integer} on completion.
   */
  static getCurrentSeasonTotalStars(userId, systemTime) {
    if (!userId) {
      return Promise.reject(new Error(`Can not get user rank: invalid user ID - ${userId}`));
    }

    return knex('users').first('rank', 'rank_stars', 'rank_starting_at').where('id', userId)
      .then(function (rankData) {
        let rank = 30;
        if (!RankModule._isSeasonTimestampExpired(rankData != null ? rankData.rank_starting_at : undefined, systemTime)) {
          ({
            rank,
          } = rankData);
        }

        let totalStars = rankData.rank_stars;
        if (rank < 30) {
          totalStars += RankFactory.totalStarsRequiredForRank(rank - 1);
        }

        return totalStars;
      });
  }

  /**
   * Claim rewards for a season's rank.
   * @public
   * @param  {String}  userId        User ID.
   * @param  {Moment}  dateWithinSeason  Pass in a moment within the season you want to claim rewards for.
   * @param  {Moment}  systemTime      Pass in the current system time to override clock. Used mostly for testing.
   * @return  {Promise}            Promise that will return rewards array on completion.
   */
  static claimRewardsForSeasonRank(userId, dateWithinSeason, systemTime) {
    if (!userId) {
      return Promise.reject(new Error(`Can not claim season rank rewards: invalid user ID - ${userId}`));
    }

    if (!dateWithinSeason) {
      return Promise.reject(new Error(`Can not claim season rank rewards: invalid season - ${dateWithinSeason}`));
    }

    const this_obj = {};
    const MOMENT_UTC_NOW = systemTime || moment().utc();
    const startOfSeasonMoment = moment(dateWithinSeason).utc().startOf('month');

    var txPromise = knex.transaction(function (tx) {
      knex('user_rank_history').where({ user_id: userId, starting_at: startOfSeasonMoment.toDate() }).first().forUpdate()
        .transacting(tx)
        .bind(this_obj)
        .then(function (rankHistoryRow) {
          if ((rankHistoryRow == null)) {
            throw new Errors.NotFoundError('Could not find last month\'s rank');
          }

          if (rankHistoryRow.rewards_claimed_at != null) {
            throw new Errors.AlreadyExistsError('Rewards already claimed for this season');
          }

          const rewards = [];
          const allPromises = [];

          // if there is a NULL value for top rank, let's make sure it's not treated as rank 0
          let highest_rank_achieved = rankHistoryRow.top_rank;
          if ((highest_rank_achieved == null)) {
            highest_rank_achieved = rankHistoryRow.rank;
          }

          // calculate rank rewards
          const rewardMap = RankModule._getSeasonRankRewardMap(highest_rank_achieved, moment.utc(rankHistoryRow.starting_at).format('YYYY/MM'));

          //
          if (rewardMap.spirit) {
            rewards.push({
              id: generatePushId(),
              user_id: userId,
              reward_category: 'season rank',
              reward_type: `rank ${rankHistoryRow.top_rank}`,
              source_id: moment.utc(rankHistoryRow.starting_at).format('YYYY/MM'),
              created_at: MOMENT_UTC_NOW.toDate(),
              spirit: rewardMap.spirit,
              is_unread: true,
            });

            allPromises.push(InventoryModule.giveUserSpirit(txPromise, tx, userId, rewardMap.spirit, 'season reward', moment.utc(rankHistoryRow.starting_at).format('YYYY/MM')));
          }

          //
          if (rewardMap.gold) {
            rewards.push({
              id: generatePushId(),
              user_id: userId,
              reward_category: 'season rank',
              reward_type: `rank ${rankHistoryRow.top_rank}`,
              source_id: moment.utc(rankHistoryRow.starting_at).format('YYYY/MM'),
              created_at: MOMENT_UTC_NOW.toDate(),
              gold: rewardMap.gold,
              is_unread: true,
            });

            allPromises.push(InventoryModule.giveUserGold(txPromise, tx, userId, rewardMap.gold, 'season reward', moment.utc(rankHistoryRow.starting_at).format('YYYY/MM')));
          }

          //
          if ((rewardMap.card_ids != null ? rewardMap.card_ids.length : undefined) > 0) {
            rewards.push({
              id: generatePushId(),
              user_id: userId,
              reward_category: 'season rank',
              reward_type: `rank ${rankHistoryRow.top_rank}`,
              source_id: moment.utc(rankHistoryRow.starting_at).format('YYYY/MM'),
              created_at: MOMENT_UTC_NOW.toDate(),
              cards: rewardMap.card_ids,
              is_unread: true,
            });

            allPromises.push(InventoryModule.giveUserCards(txPromise, tx, userId, rewardMap.card_ids, 'season reward', moment.utc(rankHistoryRow.starting_at).format('YYYY/MM')));
          }

          for (var reward of Array.from(rewards)) {
            allPromises.push(knex('user_rewards').insert(reward).transacting(tx));
          }

          Logger.module('RankModule').debug(`claimRewardsForSeasonRank() -> claiming ${(rewards != null ? rewards.length : undefined)} rewards for season ${(startOfSeasonMoment != null ? startOfSeasonMoment.format('MM/YYYY') : undefined)} rank ${highest_rank_achieved} rank by ${userId.blue}`);

          allPromises.push(knex('user_rank_history').where({ user_id: userId, starting_at: startOfSeasonMoment.toDate() }).update({
            rewards_claimed_at: MOMENT_UTC_NOW.toDate(),
            reward_ids: _.map(rewards, (r) => r.id),
            is_unread: false,
          }).transacting(tx),
          );

          this.rewards = rewards;

          return Promise.all(allPromises);
        })
        .then(() => DuelystFirebase.connect().getRootRef())
        .then(function (fbRootRef) {
          const rankHistoryFbPromise = FirebasePromises.update(fbRootRef.child('user-ranking').child(userId).child('history').child(startOfSeasonMoment.valueOf()), {
            rewards_claimed_at: MOMENT_UTC_NOW.valueOf(),
            reward_ids: _.map(this.rewards, (r) => r.id),
          });
          return rankHistoryFbPromise;
        })
        .then(() => SyncModule._bumpUserTransactionCounter(tx, userId))
        .then(tx.commit)
        .catch(tx.rollback);
    }).bind(this_obj)
      .then(function () {
        return this.rewards;
      });

    return txPromise;
  }

  static _getSeasonRankRewardMap(rank, seasonKey) {
    let commonCards,
      epicCards,
      legendaryCards,
      randomCommonCardId,
      randomEpicCardId,
      randomIndex,
      randomLegendaryCardId,
      randomRareCardId,
      rareCards;
    const reward = {};
    reward.card_ids = [];

    if (rank <= 20) { reward.gold = 90; }
    if (rank <= 10) { reward.gold = 110; }
    if (rank <= 5) { reward.gold = 150; }
    if (rank === 0) { reward.gold = 180; }

    if (rank === 20) { reward.spirit = 10; }
    if (rank === 19) { reward.spirit = 25; }
    if (rank === 18) { reward.spirit = 40; }
    if (rank === 17) { reward.spirit = 55; }
    if (rank === 16) { reward.spirit = 70; }
    if (rank === 15) { reward.spirit = 85; }
    if (rank === 14) { reward.spirit = 95; }
    if (rank === 13) { reward.spirit = 105; }
    if (rank === 12) { reward.spirit = 115; }
    if (rank === 11) { reward.spirit = 125; }
    if (rank === 10) { reward.spirit = 135; }
    if (rank === 9) { reward.spirit = 140; }
    if (rank === 8) { reward.spirit = 145; }
    if (rank === 7) { reward.spirit = 150; }
    if (rank === 6) { reward.spirit = 155; }
    if (rank === 5) { reward.spirit = 155; }
    if (rank === 4) { reward.spirit = 155; }
    if (rank === 3) { reward.spirit = 155; }
    if (rank === 2) { reward.spirit = 155; }
    if (rank === 1) { reward.spirit = 155; }
    if (rank === 0) { reward.spirit = 155; }

    if (rank === 19) { reward.bonus_spirit = 15; }
    if (rank === 18) { reward.bonus_spirit = 15; }
    if (rank === 17) { reward.bonus_spirit = 15; }
    if (rank === 16) { reward.bonus_spirit = 15; }
    if (rank === 15) { reward.bonus_spirit = 15; }
    if (rank === 14) { reward.bonus_spirit = 10; }
    if (rank === 13) { reward.bonus_spirit = 10; }
    if (rank === 12) { reward.bonus_spirit = 10; }
    if (rank === 11) { reward.bonus_spirit = 10; }
    if (rank === 10) { reward.bonus_spirit = 10; }
    if (rank === 9) { reward.bonus_spirit = 5; }
    if (rank === 8) { reward.bonus_spirit = 5; }
    if (rank === 7) { reward.bonus_spirit = 5; }
    if (rank === 6) { reward.bonus_spirit = 5; }

    if (seasonKey === '2015/10') { // October season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.Mogwai);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.BlackLocust);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.WindRunner);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.GhostLynx);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2015/11') { // November season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.Grailmaster);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.Khymera);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.Firestarter);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.Jaxi);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2015/12') { // December season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.ArakiHeadhunter);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.KeeperOfTheVale);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.ProphetWhitePalm);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.SunElemental);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/01') { // January season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.Dreamgazer);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.AstralCrusader);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.WhiteWidow);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.WingsOfParadise);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/02') { // February season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.Bonereaper);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.HollowGrovekeeper);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.Tethermancer);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.WarTalon);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/03') { // March season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.SunsetParagon);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.EXun);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.SunsteelDefender);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.SapphireSeer);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/04') { // April season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.GoldenJusticar);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.Unseven);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.Skywing);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.ArrowWhistler);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/05') { // May season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.Bastion);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.AlterRexx);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.Abjudicator);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.DiamondGolem);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/06') { // June season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.TheScientist);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.Envybaer);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.Grincher);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.Shiro);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/07') { // July season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.BloodTaura);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.RubyRifter);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.Chakkram);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.BlisteringSkorn);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/08') { // August season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.GroveLion);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.Sphynx);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.Elkowl);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.WoodWen);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/09') { // September season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.NightWatcher);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.QuartermasterGauj);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.DustWailer);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.DayWatcher);
        // random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else if (seasonKey === '2016/10') { // October season reward
      if (rank <= 20) {
        // Epic Card
        reward.card_ids.push(Cards.Neutral.Ironclad);
      }
      if (rank <= 10) {
        // Legendary Card
        reward.card_ids.push(Cards.Neutral.Decimus);
      }
      if (rank <= 5) {
        // rare card
        reward.card_ids.push(Cards.Neutral.Zyx);
      }
      if (rank === 0) {
        // common card
        reward.card_ids.push(Cards.Neutral.AzureHerald);
        // random legendary card
        epicCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Epic).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, epicCards.length - 1);
        randomEpicCardId = epicCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomEpicCardId);
      }
    } else if (seasonKey === '2016/11') { // Nov season reward
      if (rank <= 20) {
        // random Epic Card
        epicCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Epic).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, epicCards.length - 1);
        randomEpicCardId = epicCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomEpicCardId);
      }
      if (rank <= 10) {
        // random Legendary Card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
      if (rank <= 5) {
        // random rare card
        rareCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Rare).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, rareCards.length - 1);
        randomRareCardId = rareCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomRareCardId);
      }
      if (rank === 0) {
        // random common card
        commonCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Common).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, commonCards.length - 1);
        randomCommonCardId = commonCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomCommonCardId);
        // extra random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    } else { // default rewards when no other rewards specified
      if (rank <= 20) {
        // random Epic Card
        epicCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Epic).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        epicCards = epicCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Shimzar).getRarity(Rarity.Epic).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        epicCards = epicCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.CombinedUnlockables).getRarity(Rarity.Epic).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        epicCards = epicCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.FirstWatch).getRarity(Rarity.Epic).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        epicCards = epicCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Wartech).getRarity(Rarity.Epic).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        epicCards = epicCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Coreshatter).getRarity(Rarity.Epic).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        randomIndex = _.random(0, epicCards.length - 1);
        randomEpicCardId = epicCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomEpicCardId);
      }
      if (rank <= 10) {
        // random Legendary Card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Shimzar).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.CombinedUnlockables).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.FirstWatch).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Wartech).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Coreshatter).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
      if (rank <= 5) {
        // random rare card
        rareCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Rare).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        rareCards = rareCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Shimzar).getRarity(Rarity.Rare).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        rareCards = rareCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.CombinedUnlockables).getRarity(Rarity.Rare).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        rareCards = rareCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.FirstWatch).getRarity(Rarity.Rare).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        rareCards = rareCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Wartech).getRarity(Rarity.Rare).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        rareCards = rareCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Coreshatter).getRarity(Rarity.Rare).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        randomIndex = _.random(0, rareCards.length - 1);
        randomRareCardId = rareCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomRareCardId);
      }
      if (rank === 0) {
        // random common card
        commonCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Common).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        commonCards = commonCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Shimzar).getRarity(Rarity.Common).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        commonCards = commonCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.CombinedUnlockables).getRarity(Rarity.Common).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        commonCards = commonCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.FirstWatch).getRarity(Rarity.Common).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        commonCards = commonCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Wartech).getRarity(Rarity.Common).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        commonCards = commonCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Coreshatter).getRarity(Rarity.Common).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        randomIndex = _.random(0, commonCards.length - 1);
        randomCommonCardId = commonCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomCommonCardId);
        // extra random legendary card
        legendaryCards = GameSession.getCardCaches().getCardSet(SDK.CardSet.Core).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards();
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Shimzar).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.FirstWatch).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.CombinedUnlockables).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Wartech).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        legendaryCards = legendaryCards.concat(GameSession.getCardCaches().getCardSet(SDK.CardSet.Coreshatter).getRarity(Rarity.Legendary).getIsCollectible(true)
          .getIsUnlockable(false)
          .getIsPrismatic(false)
          .getCards());
        randomIndex = _.random(0, legendaryCards.length - 1);
        randomLegendaryCardId = legendaryCards[randomIndex].getBaseCardId();
        reward.card_ids.push(randomLegendaryCardId);
      }
    }

    return reward;
  }
}
RankModule.initClass();

module.exports = RankModule;
