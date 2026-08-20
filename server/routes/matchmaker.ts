/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const _ = require('underscore');
const express = require('express');

const router = express.Router();
const util = require('util');
const Logger = require('../../app/common/logger');
const CONFIG = require('../../app/common/config');
const Promise = require('bluebird');
const moment = require('moment');
const CustomError = require('../lib/custom_errors');
const isSignedIn = require('../middleware/signed_in');
const t = require('tcomb-validation');
const validators = require('../validators');

// our modules
const knex = require('../lib/data_access/knex');
const UsersModule = require('../lib/data_access/users');
const GauntletModule = require('../lib/data_access/gauntlet');
const RiftModule = require('../lib/data_access/rift');
const RankModule = require('../lib/data_access/rank');
const InventoryModule = require('../lib/data_access/inventory');

const GameType = require('../../app/sdk/gameType');
const GameSession = require('../../app/sdk/gameSession');
const Cards = require('../../app/sdk/cards/cardsLookupComplete');
const RarityFactory = require('../../app/sdk/cards/rarityFactory');
const Rarity = require('../../app/sdk/cards/rarityLookup');
const FactionsLookup = require('../../app/sdk/cards/factionsLookup');
const FactionFactory = require('../../app/sdk/cards/factionFactory');
const RankFactory = require('../../app/sdk/rank/rankFactory');
const RankDivisionLookup = require('../../app/sdk/rank/rankDivisionLookup');
const CosmeticsFactory = require('../../app/sdk/cosmetics/cosmeticsFactory');

const createSinglePlayerGame = require('../lib/create_single_player_game');

const isMatchmakingActiveAsync = require('../../worker/get_matchmaking_status');
const getGameServerAsync = require('../../worker/get_gameserver');

// redis
const Redis = require('../redis');

const rankedQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'ranked' });
const arenaQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'gauntlet' });
const riftQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'rift' });
const rankedDeckValueQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'ranked-deck-value' });
const casualQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'casual' });
const casualDeckValueQueue = new Redis.PlayerQueue(Redis.Redis, { name: 'casual-deck-value' });

// Configuration object
const config = require('../../config/config.js');

const env = config.get('env');
const { version } = require('../../version');

// # Require authentication
router.use('/matchmaking', isSignedIn);

/**
 * Router - POST - /matchmaking
 * Enters matchmaking queue
 * - validate request data {deck, factionId, gameType}
 * - validate deck
 * - check consul for maintenance status
 * - generate 'token' for request containing all request data
 * - push player to queue (currently defaults to 'rankedQueue')
 * - if inviteId, calls setupInviteGame
 * - respond 200 with token id, player can use this token id to check status or listen to errors via Firebase
 * - fire off a search/match player job
 */
router.post('/matchmaking', function (req, res, next) {
  const result = t.validate(req.body, validators.matchmakingInput);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const userId = req.user.d.id;
  const {
    inviteId,
  } = result.value;
  const {
    name,
  } = result.value;
  const {
    deck,
  } = result.value;
  const {
    factionId,
  } = result.value;
  const {
    cardBackId,
  } = result.value;
  const {
    battleMapId,
  } = result.value;
  const hasPremiumBattleMaps = result.value.hasPremiumBattleMaps || false;
  const {
    gameType,
  } = result.value;
  const {
    ticketId,
  } = result.value;
  let battleMapIndexesToSampleFrom = null; // will be configured later based on inputs

  if (hasPremiumBattleMaps && (battleMapId == null)) {
    Logger.module('MATCHMAKING').debug(`${userId} wants RANDOM battlemap`);
  } else if (battleMapId != null) {
    Logger.module('MATCHMAKING').debug(`${userId} wants battlemap ${battleMapId}`);
  }

  Logger.module('MATCHMAKING').debug(`${gameType.yellow} queue request for user: ${userId}`);
  // Logger.module("MATCHMAKING").debug "Request payload: #{util.inspect(req.body)} ".blue

  if (inviteId) {
    Logger.module('MATCHMAKING').debug(`${gameType.yellow} request for user: ${userId} : invite request with inviteId ${inviteId}`);
  }

  return isMatchmakingActiveAsync()
    .then(() => // check if the player is already waiting for a game, ie. they have a 'game' token
      Redis.TokenManager.get(userId)).then(function (token) {
      const _chainState = {};
      if (token != null) {
      // player is already waiting for a game
        return res.status(200).json({ tokenId: token.id });
      } else {
        const findDeckPromise = function () {
          if (gameType === GameType.Ranked) {
            return Promise.resolve(deck);
            //        else if gameType == GameType.Casual
            //          return Promise.resolve(deck)
          } else if (gameType === GameType.Friendly) {
            return Promise.resolve(deck);
          } else if (gameType === GameType.Gauntlet) {
            return GauntletModule.getArenaDeck(userId);
            //        else if gameType == GameType.Rift
            //          return RiftModule.getRiftRunDeck(userId,ticketId)
          } else {
            return Promise.reject(new Error(`Unknown GAME TYPE: ${gameType}`));
          }
        };

        const findRiftRatingIfNeeded = function () {
          if (gameType === GameType.Rift) {
            return RiftModule.getRunRating(userId, ticketId);
          } else {
            return Promise.resolve(null);
          }
        };

        // find the user's set up data
        return Promise.all([
          findDeckPromise(),
          findRiftRatingIfNeeded(),
        ])
          .then(function ([deck, riftRunRating]) {
            // map deck for correct formatting and anti-cheat
            deck = _.map(deck, function (card) {
              if (_.isString(card) || _.isNumber(card)) {
                return { id: card };
              } else if (card.id != null) {
                return { id: card.id };
              }
            });

            // Logger.module("MATCHMAKING").debug("deck:", @.deck)
            _chainState.deck = deck;
            _chainState.riftRunRating = riftRunRating;

            return Promise.all([
              // if no selected battlemap, but user wants a random battlemap from their set, grab the battlemaps they own and add them to the list
              (hasPremiumBattleMaps && (battleMapId == null) ? knex('user_cosmetic_inventory').select('cosmetic_id').where('cosmetic_id', '>', 50000).andWhere('cosmetic_id', '<', 60000)
                .andWhere('user_id', userId) : Promise.resolve()),
              // check whether user is allowed to use this deck
              ((gameType === GameType.Gauntlet) || (gameType === GameType.Rift) ? Promise.resolve() : UsersModule.isAllowedToUseDeck(userId, _chainState.deck, gameType, ticketId)),
              // check whether user is allowed to use this card back
              ((cardBackId != null) ? InventoryModule.isAllowedToUseCosmetic(Promise.resolve(), knex, userId, cardBackId) : Promise.resolve()),
              // check if user is allowed to use the selected battlemap
              ((battleMapId != null) ? InventoryModule.isAllowedToUseCosmetic(Promise.resolve(), knex, userId, battleMapId) : Promise.resolve()),
            ]);
          }).then(function ([ownedBattleMapCosmeticRows]) {
            let findRankMetricPromise;
            if (battleMapId != null) {
              Logger.module('MATCHMAKING').debug(`${userId} selected battlemap: ${battleMapId}`);
              if (battleMapIndexesToSampleFrom == null) { battleMapIndexesToSampleFrom = [CosmeticsFactory.cosmeticForIdentifier(battleMapId).battleMapTemplateIndex]; }
            } else if ((ownedBattleMapCosmeticRows != null ? ownedBattleMapCosmeticRows.length : undefined) > 0) {
              Logger.module('MATCHMAKING').debug(`${userId} owns following battlemaps: ${ownedBattleMapCosmeticRows}`);
              const ownedIndexes = _.map(ownedBattleMapCosmeticRows, (r) => CosmeticsFactory.cosmeticForIdentifier(r.cosmetic_id).battleMapTemplateIndex);
              if (battleMapIndexesToSampleFrom == null) { battleMapIndexesToSampleFrom = _.union(CONFIG.BATTLEMAP_DEFAULT_INDICES, ownedIndexes); }
            }

            Logger.module('MATCHMAKING').debug(`${userId} battle map indexes: ${battleMapIndexesToSampleFrom}`);

            // find rank metric
            if (gameType === GameType.Gauntlet) {
              findRankMetricPromise = GauntletModule.getRunMatchmakingMetric(userId);
            } else if (gameType === GameType.Rift) {
              findRankMetricPromise = RiftModule.getRunMatchmakingMetric(userId, ticketId);
            } else {
              findRankMetricPromise = RankModule.getCurrentSeasonRank(userId);
            }

            let riftRatingPromise = Promise.resolve(null);
            if (gameType === GameType.Rift) {
              riftRatingPromise = RiftModule.getRunRating(userId, ticketId);
            }

            return Promise.all([
              findRankMetricPromise,
              knex('users').where('id', userId).first('top_rank'),
              knex('user_progression').where('user_id', userId).first('loss_streak', 'win_streak', 'win_count', 'loss_count', 'game_count', 'last_opponent_id'),
              knex('users').where('is_bot', true).offset(knex.raw('floor(random()*110)')).first('id', 'username'),
            ]);
          })
          .then(function ([rankMetric, rankRow, lossStreakRow, randomBotRow]) {
            let topRank;
            const lossStreak = (lossStreakRow != null ? lossStreakRow.loss_streak : undefined) || 0;
            const winStreak = (lossStreakRow != null ? lossStreakRow.win_streak : undefined) || 0;
            const win_count = (lossStreakRow != null ? lossStreakRow.win_count : undefined) || 0;
            const loss_count = (lossStreakRow != null ? lossStreakRow.loss_count : undefined) || 0;
            const game_count = (lossStreakRow != null ? lossStreakRow.game_count : undefined) || 0;
            const last_opponent_id = (lossStreakRow != null ? lossStreakRow.last_opponent_id : undefined) || null;
            if ((rankRow != null ? rankRow.top_rank : undefined) === 0) {
              topRank = 0;
            } else {
              topRank = (rankRow != null ? rankRow.top_rank : undefined) || 30;
            }

            // if we're matching into the season ladder, and are one of:
            //  1. new player (0 wins)
            //  2. on a 3 or more game losing streak in Bronze division or top of Silver division
            // we will add a probability to match you against a practice bot where you have a decent chance to win
            const maxWinsBeforeNoBot = 30;
            const isLadderGame = (gameType !== GameType.Gauntlet) && (gameType !== GameType.Friendly) && (gameType !== GameType.Casual);
            const isPlayerEligibleForBots = rankMetric >= RankDivisionLookup.Silver;
            let botProbability = (0.33 * lossStreak) - (win_count / maxWinsBeforeNoBot);
            botProbability = Math.max(0, botProbability);
            botProbability = gameType === GameType.Rift ? 1.0 : botProbability;
            // if this user's NEVER won a game, give them a bot 100% of the time
            if (win_count === 0) {
              botProbability = 1.0;
            }
            Logger.module('MATCHMAKING').debug(`${gameType.yellow} request for user: ${userId} : rank metric: ${rankMetric} : eligible for bot: ${isPlayerEligibleForBots} : bot probability ${botProbability}`);
            if ((randomBotRow != null) && isLadderGame && isPlayerEligibleForBots && (Math.random() < botProbability)) {
              Logger.module('MATCHMAKING').debug(`matching ${userId} with bot`);
              // create token
              token = Redis.TokenManager.create({
                userId,
                name,
                deck: _chainState.deck,
                factionId,
                cardBackId,
                battleMapIndexes: battleMapIndexesToSampleFrom,
                gameType,
                ticketId,
                inviteId,
                rank: rankMetric,
                riftRating: _chainState.riftRunRating,
              });

              // start bot game process, but don't return this promise
              Promise.all([
                // add token so we can track whether user is still in matchmaking
                Redis.TokenManager.add(token),
                // after 5-10s match them into bot mode
                Promise.delay(5000 + (Math.random() * 5000)),
              ]).then(() => // check if player is still in matchmaking
                Redis.TokenManager.get(userId)
                  .then(function (existingToken) {
                    if ((existingToken == null)) {
                      return Logger.module('MATCHMAKING').debug(`${userId} no longer in matchmaking, cancelling bot game!`);
                    } else if (parseInt(existingToken.createdAt) !== parseInt(token.createdAt)) {
                      return Logger.module('MATCHMAKING').debug(`${userId} re-entered matchmaking, cancelling bot game!`);
                    } else {
                      Logger.module('MATCHMAKING').debug(`${userId} still in matchmaking, creating bot game`);
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
                      const aiGeneralId = _.sample(FactionFactory.generalIdsForFaction(aiFactionId).slice(0, 2));

                      // ramp difficulty from 20% to max
                      const aiDifficulty = 0.2 + (0.8 * Math.min(1.0, Math.max(0, win_count - loss_count) / 10));

                      // bots should use around ~12 random cards
                      const aiNumRandomCards = Math.floor(CONFIG.MAX_DECK_SIZE * 0.3);

                      return Promise.all([
                        // remove user from token manager
                        Redis.TokenManager.remove(userId),
                        // create game
                        createSinglePlayerGame(userId, name, gameType, existingToken.deck, cardBackId, battleMapIndexesToSampleFrom, randomBotRow.id, randomBotRow.username, aiGeneralId, null, aiDifficulty, aiNumRandomCards, null, ticketId, null),
                      ]);
                    }
                  })).catch(function (error) {
                Logger.module('MATCHMAKING').error(`ERROR: bot match for ${userId} failed! ${error.messsage || error}`.red);
                // remove user from token manager
                Redis.TokenManager.remove(userId);

                throw new Error('Match found but game failed to setup!');
              });

              // respond with tokenId
              return res.status(200).json({ tokenId: token.id });
            } else {
              let matchmakingPromises;
              const division = __guard__(RankFactory.rankedDivisionAssetNameForRank(rankMetric), (x) => x.toLowerCase());

              // calculate spirit value of the deck
              let deckSpiritValue = _.reduce(
                _chainState.deck,
                function (memo, deckCard) {
                  const deckCardId = deckCard.id;
                  const sdkCard = _.find(GameSession.getCardCaches().getCards(), (c) => c.getId() === deckCardId);
                  const rarityData = RarityFactory.rarityForIdentifier(sdkCard.getRarityId());
                  if (rarityData != null) {
                    let spiritCost;
                    if (Cards.getIsPrismaticCardId(sdkCard.getId())) {
                      spiritCost = rarityData.spiritCostPrismatic;
                    } else {
                      ({
                        spiritCost,
                      } = rarityData);
                    }
                    return memo += spiritCost;
                  }
                },
                0,
              );

              // normalize deck spirit value between 0 and 10
              deckSpiritValue /= CONFIG.MAX_EFFECTIVE_SPIRIT_VALUE;
              deckSpiritValue = Math.round(deckSpiritValue * 10);
              deckSpiritValue = Math.min(deckSpiritValue, 10);

              // rank metric is the rank and has a minimum of 0
              rankMetric = Math.max(rankMetric, 0);

              // time served metric is 0-30 like rank
              const timeServed = timeServedMetric(game_count, win_count, winStreak, rankMetric, topRank);

              // Logger.module("MATCHMAKING").debug "#{gameType.yellow} queing #{userId} : matchmaking metrics: (#{rankMetric},#{deckSpiritValue},#{timeServed})"

              // TAG: game set up: vs ranked player create token
              const tokenData = {
                userId,
                name,
                deck: _chainState.deck,
                factionId,
                cardBackId,
                battleMapIndexes: battleMapIndexesToSampleFrom,
                gameType,
                inviteId,
                ticketId,
                rank: rankMetric,
                deckValue: deckSpiritValue,
                lastOpponentId: last_opponent_id,
                riftRating: _chainState.riftRunRating,
              };

              if (inviteId != null) {
                tokenData.lastOpponentId = null;
              }
              token = Redis.TokenManager.create(tokenData);

              Logger.module('MATCHMAKING').debug(`creating token for ${userId}: `, tokenData);

              if (inviteId) {
                matchmakingPromises = [
                  Redis.TokenManager.add(token),
                  Redis.InviteQueue.add(userId, inviteId),
                ];
              } else if (gameType === GameType.Casual) {
                matchmakingPromises = [
                  Redis.TokenManager.add(token),
                  casualQueue.add(userId, timeServed),
                  casualDeckValueQueue.add(userId, deckSpiritValue),
                  casualQueue.velocity('casual'),
                ];
              } else if (gameType === GameType.Ranked) {
                matchmakingPromises = [
                  Redis.TokenManager.add(token),
                  rankedQueue.add(userId, rankMetric),
                  rankedDeckValueQueue.add(userId, deckSpiritValue),
                  rankedQueue.velocity(division),
                ];
              } else if (gameType === GameType.Gauntlet) {
                matchmakingPromises = [
                  Redis.TokenManager.add(token),
                  arenaQueue.add(userId, rankMetric),
                  arenaQueue.velocity('gauntlet'),
                ];
              } else if (gameType === GameType.Rift) {
                matchmakingPromises = [
                  Redis.TokenManager.add(token),
                  riftQueue.add(userId, rankMetric),
                  riftQueue.velocity('rift'),
                ];
              }

              return Promise.all(matchmakingPromises)
                .then(function (results) { // TODO: We should spread and validate results
                  let velocity;
                  if ((gameType === GameType.Friendly) && inviteId) {
                    Logger.module('MATCHMAKING').debug(`${gameType.yellow} invite set up for user ${userId}, sending 200 with ${token.id}`.green);
                    res.status(200).json({ tokenId: token.id });
                    setupInvite(inviteId);
                  } else if (gameType === GameType.Casual) {
                    velocity = results[2];
                    Logger.module('MATCHMAKING').debug(`${gameType.yellow} queue pushed user ${userId}, sending 200 with ${token.id}, ${velocity}`.green);
                    res.status(200).json({ tokenId: token.id, velocity });
                    // fire off matchmaking job
                    Redis.Jobs.create('matchmaking-search-casual', {
                      name: 'Casual Matchmaking Search',
                      title: util.format('GAME :: %s searching for casual game', name),
                      userId,
                      gameType,
                      tokenId: token.id,
                      rank: token.rank,
                      deckValue: token.deckValue,
                      timeServed,
                    }).delay(1000).removeOnComplete(true).save();
                  } else if (gameType === GameType.Ranked) {
                    velocity = results[3];
                    Logger.module('MATCHMAKING').debug(`${gameType.yellow} queue pushed user ${userId}, sending 200 with ${token.id}, ${velocity}`.green);
                    res.status(200).json({ tokenId: token.id, velocity });
                    // fire off matchmaking job
                    Redis.Jobs.create('matchmaking-search-ranked', {
                      name: 'Ranked Matchmaking Search',
                      title: util.format('GAME :: %s searching for game', name),
                      userId,
                      gameType,
                      tokenId: token.id,
                      rank: token.rank,
                      deckValue: token.deckValue,
                    }).delay(1000).removeOnComplete(true).save();
                  } else if (gameType === GameType.Gauntlet) {
                    velocity = results[2];
                    Logger.module('MATCHMAKING').debug(`${gameType.yellow} queue pushed user ${userId}, sending 200 with ${token.id}, ${velocity}`.green);
                    res.status(200).json({ tokenId: token.id, velocity });
                    // fire off matchmaking job
                    Redis.Jobs.create('matchmaking-search-arena', {
                      name: 'Arena Matchmaking Search',
                      title: util.format('GAME :: %s searching for arena game', name),
                      userId,
                      gameType,
                      tokenId: token.id,
                      rank: token.rank,
                      deckValue: token.deckValue,
                    }).delay(1000).removeOnComplete(true).save();
                  } else if (gameType === GameType.Rift) {
                    velocity = results[2];
                    Logger.module('MATCHMAKING').log(`${gameType.yellow} queue pushed user ${userId}, sending 200 with ${token.id}, ${velocity}`.green);
                    res.status(200).json({ tokenId: token.id, velocity });
                    // fire off matchmaking job
                    Redis.Jobs.create('matchmaking-search-rift', {
                      name: 'Rift Matchmaking Search',
                      title: util.format('GAME :: %s searching for rift game', name),
                      userId,
                      gameType,
                      tokenId: token.id,
                      rank: token.rank,
                      deckValue: token.deckValue,
                    }).delay(1000).removeOnComplete(true).save();
                  }
                });
            }
          });
      }
    })
    .catch(CustomError.NoArenaDeckError, function (error) {
      Logger.module('MATCHMAKING').error(`Request ${userId} : attempting to enter arena queue without active deck!`.red);
      return res.status(400).json({ error: error.message });
    })
    .catch(CustomError.InvalidDeckError, function (error) {
      Logger.module('MATCHMAKING').error(`Request ${userId} : attempting to use invalid deck!`.red);
      return res.status(400).json({ error: error.message });
    })
    .catch(CustomError.MatchmakingOfflineError, function (error) {
      Logger.module('MATCHMAKING').error(`Request ${userId} : Matchmaking is currently offline`.red);
      return res.status(400).json({ error: error.message });
    })
    .catch(function (error) {
      Logger.module('MATCHMAKING').error(`ERROR: Request.post /matchmaking ${userId} failed!`.red);
      return next(error);
    });
});

/**
 * Router - GET - /matchmaking
 * Returns a player's current matchmaking token or 404
 */
router.get('/matchmaking', function (req, res, next) {
  const userId = req.user.d.id;

  return Redis.TokenManager.get(userId)
    .then(function (token) {
      if (token != null) {
        return res.status(200).json(token);
      } else {
        return res.status(404).end();
      }
    }).catch(function (error) {
      Logger.module('MATCHMAKING').error(`ERROR: Request.get /matchmaking ${userId} failed!`.red);
      return next(error);
    });
});

/**
 * Router - DELETE - /matchmaking
 * Removes a player from queue & deletes their game token
 */
router.delete('/matchmaking', function (req, res, next) {
  const userId = req.user.d.id;

  return Promise.all([
    Redis.TokenManager.remove(userId),
    rankedQueue.remove(userId),
    rankedDeckValueQueue.remove(userId),
    casualQueue.remove(userId),
    casualDeckValueQueue.remove(userId),
    arenaQueue.remove(userId),
  ])
    .then((results) => res.status(204).end()).catch(function (error) {
      Logger.module('MATCHMAKING').error(`ERROR: Request.delete /matchmaking ${userId} failed!`.red);
      return next(error);
    });
});

/**
 * Setup a invite based game
 * Does nothing if there's only 1 player in the list
 * @param {String} inviteId
 */
var setupInvite = function (inviteId) {
  Logger.module('MATCHMAKING').debug(`setupInvite(${inviteId})`.blue);

  return Redis.InviteQueue.count(inviteId)
    .then(function (playerCount) {
      const _chainState = {};
      if (playerCount < 2) {
        return; // there's only 1 player
      }

      return Redis.InviteQueue.grab(inviteId)
        .then(function (results) { // TODO: we should verify results
          _chainState.playerId1 = results[0];
          _chainState.playerId2 = results[1];

          return Promise.all([
            Redis.TokenManager.get(_chainState.playerId1),
            Redis.TokenManager.get(_chainState.playerId2),
          ]);
        }).then(function (results) { // TODO: we should verify results
          _chainState.token1 = results[0];
          _chainState.token2 = results[1];

          return Redis.TokenManager.remove([_chainState.playerId1, _chainState.playerId2]);
        })
        .then(function () {
          // Fire off job to setup game between both players
          Redis.Jobs.create('matchmaking-setup-game', {
            name: 'Matchmaking Setup Game',
            title: util.format('Game :: Setup Invite Game :: %s versus %s', _chainState.token1.name, _chainState.token2.name),
            token1: _chainState.token1,
            token2: _chainState.token2,
            gameType: GameType.Friendly,
          }).removeOnComplete(true).save();
        })
        .catch((error) => Logger.module('MATCHMAKING').error(`setupInvite() failed: ${error.message}`.red));
    });
};

/**
* OLD timeServedMetric OLD
* If less than 100 games, use games played instead of rank
* Normalize # of games to 0 - 30 score
* Adjust score for number of wins
* Adjust score if on a win streak
* If more than 100 games, use average of current rank and top rank
timeServedMetric = (gameCount, winCount, winStreak, rank, topRank = 30) ->
  if (gameCount <= 99)
    * Logger.module("MATCHMAKING").debug("gameCount: #{gameCount}, winCount: #{winCount}, winStreak: #{winStreak}")
    timeServed = (1 - (gameCount / 100)) * 30
    winCountAdjust = Math.min(winCount, timeServed)
    winStreakAdjust = Math.min(0.5 * winStreak, timeServed)
    timeServed -= winCountAdjust
    timeServed -= winStreakAdjust
    * Logger.module("MATCHMAKING").debug("timeServed: #{timeServed}")
  else
    timeServed = (rank + topRank) / 2
  return Math.min(Math.round(timeServed),0)
*/

/*
 * Simple time served metric
 * if less than 20 games, normalize by WIN COUNT to rank 30-20
 * if more than 20 games but less than 100 games, normalize by win rate to rank 30-10
 * if more than 100 games, use average of current rank and top rank ever achieved
 */
var timeServedMetric = function (gameCount, winCount, winStreak, rank, topRank) {
  let timeServed;
  if (topRank == null) { topRank = 30; }
  if (gameCount < 20) {
    timeServed = Math.round(30 - (winCount * 0.5)); // 30 - 20 by wins
  } else if (gameCount < 100) {
    timeServed = Math.round((1 - ((winCount / gameCount) * 20))) + 10; // 30 - 10 by win rate
  } else {
    timeServed = (rank + topRank) / 2; // use ranked queue rank
  }
  return Math.min(Math.round(timeServed), 0);
};

module.exports = router;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
