/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
/*
Job - Update User Progression
*/
const _ = require('underscore');
const config = require('../../config/config.js');
const Logger = require('../../app/common/logger');
const colors = require('colors');
const util = require('util');
const GameType = require('../../app/sdk/gameType');
const GameStatus = require('../../app/sdk/gameStatus');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const FactionFactory = require('../../app/sdk/cards/factionFactory');

const Errors = require('../../server/lib/custom_errors');
const RankModule = require('../../server/lib/data_access/rank');
const UsersModule = require('../../server/lib/data_access/users');
const CosmeticChestsModule = require('../../server/lib/data_access/cosmetic_chests');
const GauntletModule = require('../../server/lib/data_access/gauntlet');
const RiftModule = require('../../server/lib/data_access/rift');
const GamesModule = require('../../server/lib/data_access/games');
const QuestsModule = require('../../server/lib/data_access/quests');

const { Redis, Jobs, GameManager } = require('../../server/redis');
const { onType } = require('../../app/common/utils/utils_promise');
const PromiseUtils = require('../../app/common/utils/utils_promise');

/**
 * Start processing quests for user.
 * @param  {Object} job        Kue job
 * @param  {String} userId        User ID
 * @param  {String} gameId        Game ID
 * @param  {Integer} factionId
 * @param  {Integer} generalId
 * @param  {Boolean} isWinner
 * @param  {Boolean} isDraw
 * @param  {Boolean} isUnscored
 * @param  {String} gameType      Type of game 'ranked','friendly',etc.. (see GameType)
 * @param  {Object} gameSessionData  Game Session data loaded from REDIS
 * @return  {Promise}          Promise that resolves whan this process is complete.
 */
const onProcessQuests = function (
  job,
  userId,
  opponentId,
  gameId,
  factionId,
  generalId,
  isWinner,
  isDraw,
  isUnscored,
  gameType,
  gameSessionData,
) {
  if (!isUnscored && gameSessionData != null) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing quests ...`,
    );
    return QuestsModule.updateQuestProgressWithGame(userId, gameId, gameSessionData);
  } else {
    return Promise.resolve();
  }
};

/**
 * Start processing ranked/gauntlet game outcome for user.
 * @param  {Object} job        Kue job
 * @param  {String} userId        User ID
 * @param  {String} gameId        Game ID
 * @param  {Integer} factionId
 * @param  {Integer} generalId
 * @param  {Boolean} isWinner
 * @param  {Boolean} isDraw
 * @param  {Boolean} isUnscored
 * @param  {String} gameType      Type of game 'ranked','friendly',etc.. (see GameType)
 * @param  {Object} gameSessionData  Game Session data loaded from REDIS
 * @return  {Promise}          Promise that resolves whan this process is complete.
 */
const onProcessGameType = function (
  job,
  userId,
  opponentId,
  gameId,
  factionId,
  generalId,
  isWinner,
  isDraw,
  isUnscored,
  gameType,
  gameSessionData,
  ticketId,
) {
  if (gameType === GameType.Ranked) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing rank ...`,
    );
    return RankModule.userNeedsSeasonStartRanking(userId)
      .then(function (needsCycle) {
        if (needsCycle) {
          return RankModule.cycleUserSeasonRanking(userId);
        } else {
          return Promise.resolve();
        }
      })
      .then(() => RankModule.updateUserRankingWithGameOutcome(userId, isWinner, gameId, isDraw));
  } else if (gameType === GameType.Gauntlet) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing gauntlet outcome ...`,
    );
    return GauntletModule.updateArenaRunWithGameOutcome(userId, isWinner, gameId, isDraw);
  } else if (gameType === GameType.Rift) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing rift outcome ...`,
    );
    const playerData = UtilsGameSession.getPlayerDataForId(gameSessionData, userId);
    let damageDealt = 0;
    if (playerData.totalDamageDealtToGeneral > 0) {
      // If a player won, and they did less than 25 damage to enemy general, give them 25 credit
      if (playerData.isWinner && playerData.totalDamageDealtToGeneral < 25) {
        damageDealt = 25;
      } else {
        damageDealt = playerData.totalDamageDealtToGeneral;
      }
    }
    return RiftModule.updateRiftRunWithGameOutcome(
      userId,
      ticketId,
      isWinner,
      gameId,
      isDraw,
      damageDealt,
      gameSessionData,
    );
  } else if (gameType === GameType.SinglePlayer && isWinner) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing single player outcome ...`,
    );
    // single player games should CREATE a faction xp record for the opponent faction if one already does not exist
    const opponentSetupData = _.find(
      gameSessionData.gameSetupData.players,
      (p) => p.playerId !== userId,
    );
    const opponentFactionId = opponentSetupData.factionId;
    if (opponentFactionId !== factionId) {
      // ensure opponent faction is a playable faction before making record for player
      const playableFactions = FactionFactory.getAllPlayableFactions();
      const playableOpponentFaction = _.find(
        playableFactions,
        (factionData) => factionData.id === opponentFactionId,
      );
      if (playableOpponentFaction != null) {
        const whenCreated = UsersModule.createFactionProgressionRecord(
          userId,
          opponentFactionId,
          gameId,
          gameType,
        ).catch(onType(Errors.AlreadyExistsError, function (e) {}));
        // silently catch already exist errors and move on
        return whenCreated;
      }
    }
    return Promise.resolve();
  } else {
    return Promise.resolve();
  }
};

/**
 * Start processing progression data for user.
 * @param  {Object} job        Kue job
 * @param  {String} userId        User ID
 * @param  {String} gameId        Game ID
 * @param  {Integer} factionId
 * @param  {Integer} generalId
 * @param  {Boolean} isWinner
 * @param  {Boolean} isDraw
 * @param  {Boolean} isUnscored
 * @param  {String} gameType      Type of game 'ranked','friendly',etc.. (see GameType)
 * @param  {Object} gameSessionData  Game Session data loaded from REDIS
 * @return  {Promise}          Promise that resolves whan this process is complete.
 */
const onProcessProgression = function (
  job,
  userId,
  opponentId,
  gameId,
  factionId,
  generalId,
  isWinner,
  isDraw,
  isUnscored,
  gameType,
  gameSessionData,
) {
  if (
    gameType === GameType.SinglePlayer ||
    gameType === GameType.Friendly ||
    gameType === GameType.Rift
  ) {
    return Promise.resolve();
  } else if (gameType === GameType.BossBattle) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing boss progression ...`,
    );
    return UsersModule.updateUserBossProgressionWithGameOutcome(
      userId,
      opponentId,
      isWinner,
      gameId,
      gameType,
      isUnscored,
      isDraw,
      gameSessionData,
    );
  } else {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing progression ...`,
    );
    return UsersModule.updateUserProgressionWithGameOutcome(
      userId,
      opponentId,
      isWinner,
      gameId,
      gameType,
      isUnscored,
      isDraw,
    );
  }
};

/**
 * Start processing loot crate awarding for user.
 * @param  {Object} job        Kue job
 * @param  {String} userId        User ID
 * @param  {String} gameId        Game ID
 * @param  {Integer} factionId
 * @param  {Integer} generalId
 * @param  {Boolean} isWinner
 * @param  {Boolean} isDraw
 * @param  {Boolean} isUnscored
 * @param  {String} gameType      Type of game 'ranked','friendly',etc.. (see GameType)
 * @param  {Object} gameSessionData  Game Session data loaded from REDIS
 * @return  {Promise}          Promise that resolves whan this process is complete.
 */
const onProcessLootCrates = function (
  job,
  userId,
  opponentId,
  gameId,
  factionId,
  generalId,
  isWinner,
  isDraw,
  isUnscored,
  gameType,
  gameSessionData,
) {
  if (
    gameType === GameType.SinglePlayer ||
    gameType === GameType.Friendly ||
    gameType === GameType.Rift
  ) {
    return Promise.resolve();
  } else if (gameType === GameType.BossBattle) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing loot crates ...`,
    );
    return CosmeticChestsModule.updateUserChestRewardWithBossGameOutcome(
      userId,
      isWinner,
      gameId,
      gameType,
      isUnscored,
      isDraw,
      gameSessionData,
    );
  } else {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing loot crates ...`,
    );
    return CosmeticChestsModule.updateUserChestRewardWithGameOutcome(
      userId,
      isWinner,
      gameId,
      gameType,
      isUnscored,
      isDraw,
    );
  }
};

/**
 * Start processing faction xp for user.
 * @param  {Object} job        Kue job
 * @param  {String} userId        User ID
 * @param  {String} gameId        Game ID
 * @param  {Integer} factionId
 * @param  {Boolean} isWinner
 * @param  {Boolean} isDraw
 * @param  {Boolean} isUnscored
 * @param  {String} gameType      Type of game 'ranked','friendly',etc.. (see GameType)
 * @param  {Object} gameSessionData  Game Session data loaded from REDIS
 * @return  {Promise}          Promise that resolves whan this process is complete.
 */
const onProcessFactionXp = function (
  job,
  userId,
  opponentId,
  gameId,
  factionId,
  generalId,
  isWinner,
  isDraw,
  isUnscored,
  gameType,
  gameSessionData,
) {
  if (gameType !== GameType.Rift) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing faction xp ...`,
    );
    return UsersModule.updateUserFactionProgressionWithGameOutcome(
      userId,
      factionId,
      isWinner,
      gameId,
      gameType,
      isUnscored,
      isDraw,
    );
  } else {
    return Promise.resolve();
  }
};

/**
 * Start processing game counters for user.
 * @param  {Object} job        Kue job
 * @param  {String} userId        User ID
 * @param  {String} gameId        Game ID
 * @param  {Integer} factionId
 * @param  {Integer} generalId
 * @param  {Boolean} isWinner
 * @param  {Boolean} isDraw
 * @param  {Boolean} isUnscored
 * @param  {String} gameType      Type of game 'ranked','friendly',etc.. (see GameType)
 * @param  {Object} gameSessionData  Game Session data loaded from REDIS
 * @return  {Promise}          Promise that resolves whan this process is complete.
 */
const onProcessGameCounters = function (
  job,
  userId,
  opponentId,
  gameId,
  factionId,
  generalId,
  isWinner,
  isDraw,
  isUnscored,
  gameType,
  gameSessionData,
) {
  Logger.module('JOB').debug(
    `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing game counters ...`,
  );
  return UsersModule.updateGameCounters(
    userId,
    factionId,
    generalId,
    isWinner,
    gameType,
    isUnscored,
    isDraw,
  );
};

/**
 * Start processing stats for user.
 * @param  {Object} job        Kue job
 * @param  {String} userId        User ID
 * @param  {String} gameId        Game ID
 * @param  {Integer} factionId
 * @param  {Boolean} isWinner
 * @param  {Boolean} isDraw
 * @param  {Boolean} isUnscored
 * @param  {String} gameType      Type of game 'ranked','friendly',etc.. (see GameType)
 * @param  {Object} gameSessionData  Game Session data loaded from REDIS
 * @return  {Promise}          Promise that resolves whan this process is complete.
 */
const onProcessStats = function (
  job,
  userId,
  opponentId,
  gameId,
  factionId,
  generalId,
  isWinner,
  isDraw,
  isUnscored,
  gameType,
  gameSessionData,
) {
  if (
    gameType === GameType.SinglePlayer ||
    gameType === GameType.BossBattle ||
    gameSessionData == null
  ) {
    return Promise.resolve();
  } else {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> processing stats ...`,
    );
    return UsersModule.updateUserStatsWithGame(userId, gameId, gameType, gameSessionData);
  }
};

/**
 * Start processing achievements for user.
 * @param  {Object} job        Kue job
 * @param  {String} userId        User ID
 * @param  {String} gameId        Game ID
 * @param  {Integer} factionId
 * @param  {Integer} generalId
 * @param  {Boolean} isWinner
 * @param  {Boolean} isDraw
 * @param  {Boolean} isUnscored
 * @param  {String} gameType      Type of game 'ranked','friendly',etc.. (see GameType)
 * @param  {Object} gameSessionData  Game Session data loaded from REDIS
 * @return  {Promise}          Promise that resolves whan this process is complete.
 */
const onProcessAchievements = function (
  job,
  userId,
  opponentId,
  gameId,
  factionId,
  generalId,
  isWinner,
  isDraw,
  isUnscored,
  gameType,
  gameSessionData,
) {
  if (gameType !== GameType.SinglePlayer) {
    Logger.module('JOB').debug(
      `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> starting achievements job ...`,
    );
    Jobs.enqueue(
      'update-user-achievements',
      {
        name: 'Update User Game Achievements',
        title: util.format('User %s :: Update Game Achievements', userId),
        userId,
        gameId,
        isDraw,
        isUnscored,
      },
      { removeOnComplete: true },
    );
  }
  return Promise.resolve();
};

/**
 * Job - 'update-user-post-game'
 * This job will sequentially/serially update user data for a game in several phases: 'quests','progression','faction xp', etc..
 * Any individual phase failure will not affect others, but the job will fail at the end if any of the phases do.
 * @param  {Object} job    Kue job
 * @param  {Function} done   Callback when job is complete
 */
module.exports = function (job, done) {
  const gameId = job.data.gameId || null;
  const userId = job.data.userId || null;
  const opponentId = job.data.opponentId || null;
  const factionId = job.data.factionId || null;
  const generalId = job.data.generalId || null;
  const { isWinner } = job.data;
  const { isDraw } = job.data;
  const isUnscored = job.data.isUnscored || false;
  const isBotGame = job.data.isBotGame || false;
  const ticketId = job.data.ticketId || null;
  const { gameType } = job.data;

  if (!gameId) {
    return done(new Error('Game ID is not defined.'));
  }
  if (!userId) {
    return done(new Error('User ID is not defined.'));
  }
  if (!factionId) {
    return done(new Error('factionId is not defined.'));
  }
  // isWinner may no longer be null, expect true or false
  if (isWinner == null) {
    return done(new Error('isWinner is not defined.'));
  }
  if (!gameType) {
    return done(new Error('Game type is not defined.'));
  }

  const thisObj: Record<string, any> = {};

  Logger.module('JOB').debug(
    `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> STARTING... ${gameType} winner:${isWinner} unscored:${isUnscored} draw:${isDraw}`
      .cyan,
  );

  const logSignature =
    `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> DONE - ${gameType} winner:${isWinner} unscored:${isUnscored} draw:${isDraw}`
      .green;
  Logger.module('JOB').time(logSignature);

  return GamesModule.updateUserGame(userId, gameId, {
    status: GameStatus.over,
    is_scored: !isUnscored,
    is_winner: isWinner,
    is_draw: isDraw,
    is_bot_game: isBotGame,
  })
    .then(function () {
      Logger.module('JOB').debug(
        `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> loading game session data ...`,
      );
      // grab game session data from REDIS
      return GameManager.loadGameSession(gameId)
        .then(JSON.parse) // parse game session data to JSON
        .then(function (gameSessionData) {
          Logger.module('JOB').debug(
            `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> loading game session data ... DONE`,
          );
          thisObj.gameSessionData = gameSessionData;
          return gameSessionData;
        });
    })
    .then(function (gameSessionData) {
      // process game promises
      // if the game session data is not available
      if (!gameSessionData) {
        // log out a warning that some processes will fail
        Logger.module('JOB').error(
          `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> ERROR: game session data is null. Will not be able to process quests / stats.`,
        );
      }

      // this strange structure will loop through an array of functions sequentially (one-by-one)
      // each function will kick off a processing phase and return a promise
      return PromiseUtils.each(
        [
          { name: 'quests', func: onProcessQuests },
          { name: 'game_type', func: onProcessGameType },
          { name: 'progression', func: onProcessProgression },
          { name: 'loot_crates', func: onProcessLootCrates },
          { name: 'faction_xp', func: onProcessFactionXp },
          { name: 'game_counters', func: onProcessGameCounters },
          { name: 'stats', func: onProcessStats },
          { name: 'achievements', func: onProcessAchievements },
        ],
        (item) =>
          // call the process function, and watch for errors on the returned promise
          item != null
            ? item
                .func(
                  job,
                  userId,
                  opponentId,
                  gameId,
                  factionId,
                  generalId,
                  isWinner,
                  isDraw,
                  isUnscored,
                  gameType,
                  gameSessionData,
                  ticketId,
                )
                .catch(function (e) {
                  // if we catch an error, add it to the retained error object, and log out some info
                  if (thisObj.errors == null) {
                    thisObj.errors = [];
                  }
                  thisObj.errors.push(e);
                  Logger.module('JOB').debug(`[J:${job.id}]`, e.stack);
                  return Logger.module('JOB').error(
                    `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> error processing part '${item != null ? item.name : undefined}' `,
                    e != null ? e.message : undefined,
                  );
                })
            : undefined,
      );
    })
    .then(function () {
      // done with all processes! check the retained errors object to find if any of the processes failed
      if (thisObj.errors != null ? thisObj.errors.length : undefined) {
        // throw the first error
        throw thisObj.errors[0];
      }
      // otherwise all good
      Logger.module('JOB').timeEnd(logSignature);
      // mark KUE job as done
      return done();
    })
    .catch(
      onType(PromiseUtils.TimeoutError, function (e) {
        // custom logging for promise timeout errors
        Logger.module('JOB').error(
          `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> TIMEOUT.`,
        );
        return done(e);
      }),
    )
    .catch(function (e) {
      // log out and fail the job on an error
      Logger.module('JOB').error(
        `[J:${job.id}] update-user-post-game (${userId} - ${gameId}) -> FAILED! ${e != null ? e.message : undefined}`,
      );
      // mark KUE job as done with ERROR
      return done(e);
    });
};
