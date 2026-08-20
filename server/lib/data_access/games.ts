/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const util = require('util');
const FirebasePromises = require('../firebase_promises');
const DuelystFirebase = require('../duelyst_firebase_module');
const Logger = require('../../../app/common/logger');
const colors = require('colors');
const moment = require('moment');
const _ = require('underscore');
const SyncModule = require('./sync');
const knex = require('./knex');
const config = require('../../../config/config.js');
const generatePushId = require('../../../app/common/generate_push_id');
const DataAccessHelpers = require('./helpers');

// SDK imports
const SDK = require('../../../app/sdk');
const UtilsGameSession = require('../../../app/common/utils/utils_game_session');
const PromiseUtils = require('../../../app/common/utils/utils_promise');
const { onType } = require('../../../app/common/utils/utils_promise');
const Errors = require('../custom_errors');

class GamesModule {
  /**
   * Save a finished game's metadata to DB
   * @public
   * @param  {String}  gameId      Game ID.
   * @param  {Object}  gameData    Data to save.
   * @return  {Promise}          Promise that will resolve on completion
   */
  static saveGameMetadata(gameId, gameData, s3Url) {
    Logger.module('GamesModule').debug('saveGameMetadata()');

    const NOW_UTC_MOMENT = moment.utc();

    return knex.transaction(function (tx) {
      let player1General, player2General;
      const winner = _.find(gameData.players, (p) => p.isWinner);
      const loser = _.find(gameData.players, (p) => !p.isWinner);

      let isConceded = null;
      if (winner != null) {
        isConceded = loser.hasResigned || false;
      }

      // game duration in seconds
      const lastActionTimestamp = gameData.lastActionTimestamp || moment().utc();
      const gameStart = moment.utc(gameData.createdAt);
      const gameEnd = moment.utc(lastActionTimestamp);
      const duration = moment.duration(gameEnd.diff(gameStart));
      const gameDuration = Math.round(duration.asSeconds());

      // find generals
      const cardsIndices = Object.keys(gameData.cardsByIndex);
      for (var index of Array.from<any>(cardsIndices)) {
        var card = gameData.cardsByIndex[index];
        if (card.isGeneral && card.ownerId === gameData.players[0].playerId) {
          player1General = card;
        }
        if (card.isGeneral && card.ownerId === gameData.players[1].playerId) {
          player2General = card;
        }
        if (player1General != null && player2General != null) {
          break;
        }
      }

      const player1Health = Math.max(
        0,
        (player1General != null ? player1General.maxHP : undefined) -
          ((player1General != null ? player1General.damage : undefined) || 0),
      );
      const player2Health = Math.max(
        0,
        (player2General != null ? player2General.maxHP : undefined) -
          ((player2General != null ? player2General.damage : undefined) || 0),
      );

      let player1Rank = parseInt(gameData.players[0].rank);
      let player2Rank = parseInt(gameData.players[1].rank);

      if (isNaN(player1Rank)) {
        player1Rank = null;
      }
      if (isNaN(player2Rank)) {
        player2Rank = null;
      }

      let isBotGame = false;
      if (gameData.aiPlayerId != null) {
        isBotGame = true;
      }

      const gameRecord = {
        id: gameId,
        type: gameData.gameType,
        version: gameData.version,
        status: gameData.status,
        winner_id: (winner != null ? winner.playerId : undefined) || null,
        is_conceded: isConceded,
        created_at: moment.utc(gameData.createdAt).toDate(),
        ended_at: NOW_UTC_MOMENT.toDate(),
        duration: gameDuration,
        game_data_json_url: s3Url,

        player_1_id: gameData.players[0].playerId,
        player_1_faction_id: gameData.gameSetupData.players[0].factionId,
        player_1_general_id: gameData.gameSetupData.players[0].generalId,
        player_1_deck: _.map(gameData.gameSetupData.players[0].deck, (cardObject) => cardObject.id),
        player_1_health: player1Health,
        player_1_rank: player1Rank,

        player_2_id: gameData.players[1].playerId,
        player_2_faction_id: gameData.gameSetupData.players[1].factionId,
        player_2_general_id: gameData.gameSetupData.players[1].generalId,
        player_2_deck: _.map(gameData.gameSetupData.players[1].deck, (cardObject) => cardObject.id),
        player_2_health: player2Health,
        player_2_rank: player2Rank,

        is_bot_game: isBotGame,
      };

      // Logger.module("GamesModule").debug "gameRecord: ",gameRecord

      knex('games').insert(gameRecord).transacting(tx).then(tx.commit).catch(tx.rollback);
    });
  }

  /**
   * Add a new user game record
   * @public
   * @param  {String}  userId      User ID.
   * @param  {String}  gameId      Game ID.
   * @param  {Object}  newGameParams  Params to save.
   * @return  {Promise}          Promise that will resolve on completion
   */
  static newUserGame(userId, gameId, newGameParams) {
    const NOW_UTC_MOMENT = moment.utc();
    return knex
      .transaction(function (tx) {
        newGameParams.user_id = userId;
        newGameParams.created_at = moment.utc(newGameParams.created_at).toDate();
        Logger.module('GamesModule').log(
          `newUserGame() -> inserting u:${userId} g:${gameId} duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
        );

        return PromiseUtils.withTimeout(
          tx('user_games')
            .insert(newGameParams)
            .then(() =>
              Logger.module('GamesModule').log(
                `newUserGame() -> inserted u:${userId} g:${gameId} duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              ),
            )
            .then(() => DuelystFirebase.connect().getRootRef())
            .then(function (fbRootRef) {
              // save game record to user firebase
              Logger.module('GamesModule').log(
                `newUserGame() -> updating firebase u:${userId} g:${gameId} duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              );
              return FirebasePromises.set(
                fbRootRef.child('user-games').child(userId).child(gameId),
                DataAccessHelpers.restifyData(newGameParams),
              );
            })
            .then(() =>
              Logger.module('GamesModule').log(
                `newUserGame() -> updated firebase u:${userId} g:${gameId} duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              ),
            ),
          15000,
        ) // timeout after 15 seconds
          .catch(
            onType(PromiseUtils.TimeoutError, function (e) {
              Logger.module('GamesModule').error(
                `newUserGame() -> ERROR, operation timeout for u:${userId} g:${gameId}`,
              );
              throw e;
            }),
          );
      })
      .then(() =>
        Logger.module('GamesModule').log(
          `newUserGame() -> DONE for u:${userId} g:${gameId} duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
        ),
      );
  }

  /**
   * Add a new user game record
   * @public
   * @param  {KNEX.Transaction}  tx            KNEX Transaction to attach the operation to.
   * @param  {String}      userId          User ID.
   * @param  {String}      gameId          Game ID.
   * @param  {String}      rewardId        Reward ID to add.
   * @param  {Object}      andUpdateAttributes    (OPTIONAL) Merge these atrributes in as well.
   * @return  {Promise}                  Promise that will resolve on completion
   */
  static _addRewardIdToUserGame(tx, userId, gameId, rewardId, andUpdateAttributes) {
    return tx('user_games')
      .first('reward_ids')
      .where({ user_id: userId, game_id: gameId })
      .forUpdate()
      .then(function (gameRow) {
        if (gameRow != null) {
          const updateParams: Record<string, any> = {};
          updateParams.reward_ids = gameRow.reward_ids || [];
          updateParams.reward_ids.push(rewardId);
          _.extend(updateParams, andUpdateAttributes);

          return tx('user_games').where({ user_id: userId, game_id: gameId }).update(updateParams);
        }
      })
      .then(() => DuelystFirebase.connect().getRootRef())
      .then((fbRootRef) =>
        FirebasePromises.set(
          fbRootRef
            .child('user-games')
            .child(userId)
            .child(gameId)
            .child('rewards')
            .child(rewardId),
          true,
        ),
      );
  }

  /**
   * Add user game record
   * @public
   * @param  {String}  userId      User ID.
   * @param  {String}  gameId      Game ID.
   * @param  {Object}  updateParams  Params to save.
   * @return  {Promise}          Promise that will resolve on completion
   */
  static updateUserGame(userId, gameId, updateParams) {
    const NOW_UTC_MOMENT = moment.utc();

    updateParams.updated_at = NOW_UTC_MOMENT.valueOf();

    let ended_at = null;
    if (updateParams.status === SDK.GameStatus.over) {
      ended_at = NOW_UTC_MOMENT.toDate();
      updateParams.ended_at = NOW_UTC_MOMENT.valueOf();
    }

    return knex
      .transaction(function (tx) {
        Logger.module('GamesModule').log(
          `updateUserGame() -> locking user (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
        );
        return PromiseUtils.withTimeout(
          Promise.resolve(tx('users').where({ id: userId }).first('id').forUpdate())
            .then(() =>
              Logger.module('GamesModule').log(
                `updateUserGame() -> locked user (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              ),
            )
            .then(function () {
              Logger.module('GamesModule').log(
                `updateUserGame() -> locking game (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              );
              return tx('user_games')
                .where({ user_id: userId, game_id: gameId })
                .first('game_id')
                .forUpdate();
            })
            .then(() =>
              Logger.module('GamesModule').log(
                `updateUserGame() -> locked game (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              ),
            )
            .then(function () {
              Logger.module('GamesModule').log(
                `updateUserGame() -> updating game data (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              );
              return tx('user_games')
                .where({ user_id: userId, game_id: gameId })
                .update({
                  status: updateParams.status,
                  is_winner: updateParams.is_winner || false,
                  is_draw: updateParams.is_draw || false,
                  is_scored: updateParams.is_scored,
                  is_bot_game: updateParams.is_bot_game || false,
                  ended_at,
                  updated_at: NOW_UTC_MOMENT.toDate(),
                });
            })
            .then(() =>
              Logger.module('GamesModule').log(
                `updateUserGame() -> updated game (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              ),
            )
            .then(() => DuelystFirebase.connect().getRootRef())
            .then(function (fbRootRef) {
              Logger.module('GamesModule').log(
                `updateUserGame() -> updating firebase data (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              );
              return FirebasePromises.update(
                fbRootRef.child('user-games').child(userId).child(gameId),
                DataAccessHelpers.restifyData(updateParams),
              );
            })
            .then(() =>
              Logger.module('GamesModule').log(
                `updateUserGame() -> updated firebase data (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              ),
            )
            .then(function () {
              Logger.module('GamesModule').log(
                `updateUserGame() -> bumping tx count (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              );
              return SyncModule._bumpUserTransactionCounter(tx, userId);
            })
            .then(() =>
              Logger.module('GamesModule').log(
                `updateUserGame() -> bumped tx count (u:${userId} g:${gameId}) duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
              ),
            ),
          10000,
        ).catch(
          onType(PromiseUtils.TimeoutError, function (e) {
            Logger.module('GamesModule').error(
              `updateUserGame() -> ERROR, operation timeout for u:${userId} g:${gameId}`,
            );
            throw e;
          }),
        );
      })
      .then(() =>
        Logger.module('GamesModule').log(
          `updateUserGame() -> DONE for u:${userId} g:${gameId} duration: ${moment.utc() - NOW_UTC_MOMENT}ms`,
        ),
      );
  }

  /**
   * Mark firebase job status as complete for a user game
   * @public
   * @param  {String}  userId      User ID.
   * @param  {String}  gameId      Game ID.
   * @param  {String}  jobName      Name of job to mark as complete.
   * @return  {Promise}          Promise that will resolve on completion
   */
  static markClientGameJobStatusAsComplete(userId, gameId, jobName) {
    return DuelystFirebase.connect()
      .getRootRef()
      .then((fbRootRef) =>
        FirebasePromises.set(
          fbRootRef
            .child('user-games')
            .child(userId)
            .child(gameId)
            .child('job_status')
            .child(jobName),
          true,
        ),
      );
  }

  /**
   * Create a sharable replay from a user game
   * @public
   * @param  {String}  userId      User ID.
   * @param  {String}  gameId      Game ID.
   * @return  {Promise}          Promise that will resolve on completion
   */
  static shareReplay(userId, gameId) {
    const NOW_UTC_MOMENT = moment.utc();

    let replayRow = {
      replay_id: generatePushId(),
      game_id: gameId,
      user_id: userId,
      created_at: NOW_UTC_MOMENT.toDate(),
      version: config.version,
    };

    return knex
      .transaction((tx) =>
        Promise.all([
          tx('user_games').where({ user_id: userId, game_id: gameId }).first(),
          tx('user_replays').where({ user_id: userId, game_id: gameId }).first(),
        ]).then(function ([userGameData, replayData]) {
          if (userGameData == null) {
            throw new Errors.NotFoundError('Game not found');
          } else if (replayData != null) {
            return (replayRow = replayData);
          } else {
            Logger.module('GamesModule').log(
              `shareReplay() -> sharing replay (u:${userId} g:${gameId}) replay id: ${replayRow.replay_id}`,
            );
            return tx('user_replays').insert(replayRow);
          }
        }),
      )
      .then(() => replayRow);
  }
}

module.exports = GamesModule;
