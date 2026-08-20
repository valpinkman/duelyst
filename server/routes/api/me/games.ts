/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const express = require('express');
const request = require('superagent');
const moment = require('moment');
const Promise = require('bluebird');
const _ = require('underscore');
const { GameManager } = require('../../../redis');
const { WatchableGamesManager } = require('../../../redis');

// sdk
const GameSetup = require('../../../../app/sdk/gameSetup');
const GameType = require('../../../../app/sdk/gameType');
const GameStatus = require('../../../../app/sdk/gameStatus');
const GameSession = require('../../../../app/sdk/gameSession');
const FactionProgression = require('../../../../app/sdk/progression/factionProgression');
const GamesModule = require('../../../lib/data_access/games');
const UsersModule = require('../../../lib/data_access/users');
const InventoryModule = require('../../../lib/data_access/inventory');
const DecksModule = require('../../../lib/data_access/decks');
const knex = require('../../../lib/data_access/knex');
const DataAccessHelpers = require('../../../lib/data_access/helpers');
const Logger = require('../../../../app/common/logger');
const Errors = require('../../../lib/custom_errors');
const generatePushId = require('../../../../app/common/generate_push_id');
const Consul = require('../../../lib/consul');
const config = require('../../../../config/config');
const CONFIG = require('../../../../app/common/config');
const { version } = require('../../../../version');
const t = require('tcomb-validation');
const validators = require('../../../validators');
const createSinglePlayerGame = require('../../../lib/create_single_player_game');
const validatorTypes = require('../../../validators/types');
const UtilsGameSession = require('../../../../app/common/utils/utils_game_session');

const RankDivisionLookup = require('../../../../app/sdk/rank/rankDivisionLookup');
const RankFactory = require('../../../../app/sdk/rank/rankFactory');
const CardType = require('../../../../app/sdk/cards/cardType');
const Rarity = require('../../../../app/sdk/cards/rarityLookup');
const Cards = require('../../../../app/sdk/cards/cardsLookupComplete');
const GameSetups = require('../../../ai/decks/game_setups');
const CosmeticsFactory = require('../../../../app/sdk/cosmetics/cosmeticsFactory');
const { onType } = require('../../../../app/common/utils/utils_promise');

const awsRegion = config.get('aws.region');
const awsReplaysBucket = config.get('aws.replaysBucketName');

const router = express.Router();

router.get('/', function (req, res, next) {
  const user_id = req.user.d.id;
  let {
    page,
  } = req.query;

  if (page == null) { page = 0; }

  Logger.module('API').debug(`loading games for page: ${page}`);

  return knex('user_games').where('user_id', user_id).orderBy('game_id', 'desc').offset(page * 10)
    .limit(10)
    .select()
    .then(function (rows) {
      const playerFacingRows = _.map(rows, function (row) {
        row = _.omit(row, ['rating', 'rating_delta', 'is_bot_game']);
        // row["digest"] = DecksModule.hashForDeck(row["deck_cards"], user_id)
        return row;
      });
      return res.status(200).json(DataAccessHelpers.restifyData(playerFacingRows));
    })
    .catch((error) => next(error));
});

router.get('/watchable/:division_name', function (req, res, next) {
  let division_name = t.validate(req.params.division_name, validatorTypes.DivisionName);
  if (!division_name.isValid()) {
    return res.status(400).json(division_name.errors);
  }
  ({
    division_name,
  } = req.params);
  division_name = division_name.charAt(0).toUpperCase() + division_name.slice(1);

  const divisionRankMaxValue = RankDivisionLookup[division_name];
  let divisionRankMinValue = -1;

  for (let i = divisionRankMaxValue, asc = divisionRankMaxValue <= 0; asc ? i <= 0 : i >= 0; asc ? i++ : i--) {
    if (RankFactory.rankedDivisionKeyForRank(i) !== division_name) {
      divisionRankMinValue = i;
      break;
    }
  }

  return WatchableGamesManager.loadGamesDataForDivision(division_name)
    .then(function (data) {
      if (data) {
        Logger.module('API').debug('loaded watchable games data from REDIS');
        return res.status(200).json(data);
      } else {
        let gameVersion = version.slice(0, version.lastIndexOf('.'));
        gameVersion += '%';

        // if (config.get('env') == "local")
        //   gameVersion = '%%'

        const requiredGameCount = config.get('watchSectionMinCurrentVersionGameCount') || 1000;

        Logger.module('API').debug(`GENERATING watchable games data from rank ${divisionRankMaxValue} to ${divisionRankMinValue}`);
        // first write an empty array into redis while the query is running so other servers don't step on the process toes
        return WatchableGamesManager.saveGamesDataForDivision(division_name, JSON.stringify([]))
          .bind({})
          .then(() => knex.raw(`\
select count(id) as game_count
from (select * from games order by created_at DESC LIMIT ?) as games
where version LIKE ?\
`, [requiredGameCount, gameVersion])).then(function (result) {
            const gameCount = __guard__(__guard__(result != null ? result.rows : undefined, (x1) => x1[0]), (x) => x.game_count) || 0;
            Logger.module('API').debug(`Found ${gameCount} potential watchable games within version ${version}. Need ${requiredGameCount}`);
            if (gameCount < requiredGameCount) {
              this.gamesData = [];
              return Promise.resolve(null);
            } else {
              // NOTE: this is a very expensive query
              return knex.raw(
                `\
select
  games.*,
  player_1.portrait_id AS player_1_portrait_id,
  player_1.username AS player_1_username,
  player_2.portrait_id AS player_2_portrait_id,
  player_2.username AS player_2_username
from
  (
    select *
    from (
      select * from games
      order by created_at DESC LIMIT 10000
    ) as inner_games
    where
      is_conceded = false AND
      is_bot_game = false AND
      type = 'ranked' AND
      duration < 700 AND
      abs(player_1_health - player_2_health) < 10 AND
      player_1_rank > ? AND
      player_1_rank <= ? AND
      player_2_rank > ? AND
      player_2_rank <= ? AND
      version LIKE ?
    LIMIT 10
  ) as games

JOIN users AS player_1 ON player_1.id = games.player_1_id
JOIN users AS player_2 ON player_2.id = games.player_2_id;\
`,
                [divisionRankMinValue, divisionRankMaxValue, divisionRankMinValue, divisionRankMaxValue, gameVersion],
              );
            }
          })
          .then(function (result) {
            if (result != null) {
              const {
                rows,
              } = result;

              // TODO: This seems broken, validate and handle here: https://trello.com/c/yiWKXGlI/2187
              const allCollectibleUnitsCache = GameSession.getCardCaches().getType(CardType.Unit).getIsCollectible(true).getIsHiddenInCollection(false)
                .getIsPrismatic(false);
              const allCollectibleUnits = allCollectibleUnitsCache.getCards();
              const allCollectibleUnitsIds = allCollectibleUnitsCache.getCardIds();

              this.gamesData = _.map(rows, function (row) {
                row.player_1_deck = _.intersection(allCollectibleUnitsIds, _.uniq(row.player_1_deck));
                row.player_2_deck = _.intersection(allCollectibleUnitsIds, _.uniq(row.player_2_deck));
                row.player_1_deck = _.sortBy(row.player_1_deck, (cId) => _.find(allCollectibleUnits, (u) => u.id === cId).rarityId);
                row.player_2_deck = _.sortBy(row.player_2_deck, (cId) => _.find(allCollectibleUnits, (u) => u.id === cId).rarityId);

                return {
                  id: row.id,
                  division: division_name.toLowerCase(),
                  created_at: moment.utc(row.created_at).valueOf(),
                  winner_id: row.winner_id,
                  // p1
                  player_1_id: row.player_1_id,
                  player_1_username: row.player_1_username,
                  player_1_faction_id: row.player_1_faction_id,
                  player_1_general_id: row.player_1_general_id,
                  player_1_portrait_id: row.player_1_portrait_id,
                  player_1_key_cards: row.player_1_deck.slice(1, 5),
                  // p2
                  player_2_id: row.player_2_id,
                  player_2_username: row.player_2_username,
                  player_2_faction_id: row.player_2_faction_id,
                  player_2_general_id: row.player_2_general_id,
                  player_2_portrait_id: row.player_2_portrait_id,
                  player_2_key_cards: row.player_2_deck.slice(1, 5),
                };
              });

              return Promise.map(this.gamesData, function (gameRow) {
                const gameDataUrl = `https://s3.${awsRegion}.amazonaws.com/${awsReplaysBucket}/${config.get('env')}/${gameRow.id}.json`;
                Logger.module('API').debug(`downloading game ${gameRow.id} replay data from ${gameDataUrl}`);
                return new Promise((resolve, reject) => request.get(gameDataUrl).end(function (err, res) {
                  if ((res != null) && (res.status >= 400)) {
                    // Network failure, we should probably return a more intuitive error object
                    Logger.module('API').error(`ERROR! Failed to connect to games data: ${res.status} `.red);
                    return reject(new Error('Failed to connect to games data.'));
                  } else if (err) {
                    // Internal failure
                    Logger.module('API').error(`ERROR! _retrieveGameSessionData() failed: ${err.message} `.red);
                    return reject(err);
                  } else {
                    return resolve(res.text);
                  }
                })).then(function (gameSessionDataString) {
                  // scrub the data here
                  Logger.module('API').debug(`deserializing game ${gameRow.id} replay data`);
                  const gameSession = GameSession.create();
                  gameSession.deserializeSessionFromFirebase(JSON.parse(gameSessionDataString));
                  gameRow.player_1_key_cards = [];
                  gameRow.player_2_key_cards = [];
                  return Array.from<any>(gameSession.turns).map((turn) =>
                    (() => {
                      const result1 = [];
                      for (var step of Array.from<any>(turn.steps)) {
                        if ((step.action.type === 'PlayCardFromHandAction') && (step.action.getCard().getType() === CardType.Unit)) {
                          var playerId = step.getPlayerId();
                          var cardId = step.action.getCard().getId();
                          Logger.module('API').debug(`adding key card ${cardId} for game ${gameRow.id} player ${playerId}`);
                          //
                          if ((gameRow.player_1_id === playerId) && (gameRow.player_1_key_cards.length < 4)) {
                            gameRow.player_1_key_cards.push(cardId);
                          }
                          //
                          if ((gameRow.player_2_id === playerId) && (gameRow.player_2_key_cards.length < 4)) {
                            result1.push(gameRow.player_2_key_cards.push(cardId));
                          } else {
                            result1.push(undefined);
                          }
                        } else {
                          result1.push(undefined);
                        }
                      }
                      return result1;
                    })());
                });
              });
            }
          })
          .then(function () {
            return WatchableGamesManager.saveGamesDataForDivision(division_name, JSON.stringify(this.gamesData));
          })
          .then(function () {
            return res.status(200).json(this.gamesData);
          });
      }
    }).catch((error) => next(error));
});

router.get('/watchable/:division_name/:game_id/replay_data', function (req, res, next) {
  Logger.module('API').debug('watchable/:division_name/:game_id/replay_data');

  let division_name = t.validate(req.params.division_name, validatorTypes.DivisionName);
  if (!division_name.isValid()) {
    return res.status(400).json(division_name.errors);
  }

  const result = t.validate(req.params.game_id, t.subtype(t.Str, (s) => s.length <= 36));
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  // user id is set by a middleware
  const {
    user_id,
  } = req;
  const game_id = result.value;
  const player_id = req.query.playerId;

  ({
    division_name,
  } = req.params);
  division_name = division_name.charAt(0).toUpperCase() + division_name.slice(1);

  Logger.module('API').debug('loading watchable game metadata for division from REDIS');

  return WatchableGamesManager.loadGamesDataForDivision(division_name)
    .then(function (data) {
      Logger.module('API').debug(`checking that ${game_id} is in list of promoted games`);
      if (!(_.find(data, (g) => g.id === game_id))) {
        throw new Errors.NotFoundError();
      }
      return knex('games').where('id', game_id).first();
    }).then(function (row) {
      if (row != null) {
        const gameDataUrl = `https://s3.${awsRegion}.amazonaws.com/${awsReplaysBucket}/${config.get('env')}/${game_id}.json`;
        const mouseUIDataUrl = `https://s3.${awsRegion}.amazonaws.com/${awsReplaysBucket}/${config.get('env')}/ui_events/${game_id}.json`;
        Logger.module('API').debug(`starting download of game ${game_id} replay data from ${gameDataUrl}`);
        const downloadGameSessionDataAsync = new Promise((resolve, reject) => request.get(gameDataUrl).end(function (err, res) {
          if ((res != null) && (res.status >= 400)) {
          // Network failure, we should probably return a more intuitive error object
            Logger.module('API').error(`ERROR! Failed to connect to games data: ${res.status} `.red);
            return reject(new Error('Failed to connect to games data.'));
          } else if (err) {
          // Internal failure
            Logger.module('API').error(`ERROR! _retrieveGameSessionData() failed: ${err.message} `.red);
            return reject(err);
          } else {
            return resolve(res.text);
          }
        }));
        const downloadMouseUIDataAsync = new Promise((resolve, reject) => request.get(mouseUIDataUrl).end(function (err, res) {
          if ((res != null) && (res.status >= 400)) {
          // Network failure, we should probably return a more intuitive error object
            Logger.module('API').error(`ERROR! Failed to connect to ui event data: ${res.status} `.red);
            return reject(new Error('Failed to connect to ui event data.'));
          } else if (err) {
          // Internal failure
            Logger.module('API').error(`ERROR! _retrieveGameUIEventData() failed: ${err.message} `.red);
            return reject(err);
          } else {
            return resolve(res.text);
          }
        }));
        return Promise.all([
          downloadGameSessionDataAsync,
          downloadMouseUIDataAsync,
        ]);
      } else {
        return [null, null];
      }
    })
    .then(function ([gameDataString, mouseUIDataString]) {
      Logger.module('API').debug(`downloaded game ${game_id} replay data. size:${(gameDataString != null ? gameDataString.length : undefined) || 0}`);
      if ((gameDataString == null) || (mouseUIDataString == null)) {
        return res.status(404).json({});
      } else {
        let gameSessionData = JSON.parse(gameDataString);
        const mouseUIData = JSON.parse(mouseUIDataString);

        // initialize game session for scrubbing
        const gameSession = GameSession.create();
        gameSession.deserializeSessionFromFirebase(JSON.parse(gameDataString));

        // player perspective
        const fromPerspectiveOfPlayerId = player_id || gameSession.getWinnerId();

        // scrub data
        gameSessionData = UtilsGameSession.scrubGameSessionData(gameSession, gameSessionData, fromPerspectiveOfPlayerId, true);

        return res.status(200).json({ gameSessionData, mouseUIData });
      }
    })
    .catch((error) => next(error));
});

router.put('/:game_id/gold_tip_amount', function (req, res, next) {
  let game_id = t.validate(req.params.game_id, t.subtype(t.Str, (s) => s.length <= 36));
  if (!game_id.isValid()) {
    return next();
  }
  let amount = t.validate(req.body.amount, t.subtype(t.Number, (n) => n === 5));
  if (!amount.isValid()) {
    return res.status(400).json(amount.errors);
  }

  const user_id = req.user.d.id;
  game_id = game_id.value;
  amount = amount.value;

  return UsersModule.tipAnotherPlayerForGame(user_id, game_id, amount)
    .then(() => res.status(200).json({}))
    .catch(onType(Errors.AlreadyExistsError, (e) => res.status(304).json({})))
    .catch((error) => next(error));
});

router.post('/single_player', function (req, res, next) {
  const result = t.validate(req.body, validators.singlePlayerInput);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const userId = req.user.d.id;
  let {
    deck,
  } = result.value;
  const aiGeneralId = result.value.ai_general_id;
  const {
    cardBackId,
  } = result.value;
  const {
    battleMapId,
  } = result.value;
  const hasPremiumBattleMaps = result.value.hasPremiumBattleMaps || false;
  let battleMapIndexesToSampleFrom = null; // will be configured later based on inputs
  const {
    ai_username,
  } = result.value;

  if (hasPremiumBattleMaps && (battleMapId == null)) {
    Logger.module('SINGLE PLAYER').debug(`${userId} wants RANDOM battlemap`);
  } else if (battleMapId != null) {
    Logger.module('SINGLE PLAYER').debug(`${userId} wants battlemap ${battleMapId}`);
  }

  // re-map deck for correct formatting and anti-cheat
  deck = _.map(deck, function (card) {
    if (_.isString(card) || _.isNumber(card)) {
      return { id: card };
    } else if (card.id != null) {
      return { id: card.id };
    }
  });

  // get user faction
  const generalId = deck[0].id;
  const generalCard = GameSession.getCardCaches().getCardById(generalId);
  const userFactionId = generalCard.getFactionId();

  // validate deck
  return Promise.all([
    // if no selected battlemap, but user wants a random battlemap from their set, grab the battlemaps they own and add them to the list
    (hasPremiumBattleMaps && (battleMapId == null) ? knex('user_cosmetic_inventory').select('cosmetic_id').where('cosmetic_id', '>', 50000).andWhere('cosmetic_id', '<', 60000)
      .andWhere('user_id', userId) : Promise.resolve()),
    // check whether user is allowed to use this deck
    UsersModule.isAllowedToUseDeck(userId, deck, GameType.SinglePlayer, null),
    // check whether user is allowed to use this card back
    ((cardBackId != null) ? InventoryModule.isAllowedToUseCosmetic(Promise.resolve(), knex, userId, cardBackId) : Promise.resolve()),
    ((battleMapId != null) ? InventoryModule.isAllowedToUseCosmetic(Promise.resolve(), knex, userId, battleMapId) : Promise.resolve()),
  ])
    .bind({})
    .then(function ([ownedBattleMapCosmeticRows]) {
      if (battleMapId != null) {
        Logger.module('SINGLE PLAYER').debug(`${userId} selected battlemap: ${battleMapId}`);
        if (battleMapIndexesToSampleFrom == null) { battleMapIndexesToSampleFrom = [CosmeticsFactory.cosmeticForIdentifier(battleMapId).battleMapTemplateIndex]; }
      } else if ((ownedBattleMapCosmeticRows != null ? ownedBattleMapCosmeticRows.length : undefined) > 0) {
        Logger.module('SINGLE PLAYER').debug(`${userId} owns following battlemaps: ${ownedBattleMapCosmeticRows}`);
        const ownedIndexes = _.map(ownedBattleMapCosmeticRows, (r) => CosmeticsFactory.cosmeticForIdentifier(r.cosmetic_id).battleMapTemplateIndex);
        if (battleMapIndexesToSampleFrom == null) { battleMapIndexesToSampleFrom = _.union(CONFIG.BATTLEMAP_DEFAULT_INDICES, ownedIndexes); }
      }

      return knex('user_faction_progression').where({ user_id: userId, faction_id: userFactionId }).first('win_count');
    }).then(function (progressionRow) {
    // setup ai username from general name
      let aiDifficulty,
        aiNumRandomCards;
      const aiPlayerId = CONFIG.AI_PLAYER_ID;
      const aiGeneralCard = GameSession.getCardCaches().getCardById(aiGeneralId);
      const aiUsername = ai_username || (aiGeneralCard != null ? aiGeneralCard.getName() : undefined) || 'Opponent';

      // allow customization of single player games when ai tools are enabled
      if (config.get('aiToolsEnabled')) {
        aiDifficulty = result.value.ai_difficulty;
        aiNumRandomCards = result.value.ai_num_random_cards;
        Logger.module('SINGLE PLAYER').debug(`Custom request ${userId} : AI difficulty: ${aiDifficulty} : num random cards: ${aiNumRandomCards}`);
      }

      if ((aiDifficulty == null)) {
      // ai difficulty ramps up from 0% to max based on faction win count
        const win_count = (progressionRow != null ? progressionRow.win_count : undefined) || 0;
        aiDifficulty = Math.min(1.0, win_count / 10);
        Logger.module('SINGLE PLAYER').debug(`Request ${userId} : AI difficulty: ${aiDifficulty} : Win count: ${win_count}`);
      }

      if ((aiNumRandomCards == null)) {
      // ai in single player should never use random cards
        aiNumRandomCards = 0;
      }

      // custom game setup options
      const gameSetupOptions = {
        ai: {
        // set ai starting hand size based on difficulty
          startingHandSize: Math.min(CONFIG.STARTING_HAND_SIZE, Math.max(1, Math.floor(CONFIG.STARTING_HAND_SIZE * Math.min(1.0, aiDifficulty / 0.2)))),
        },
      };

      // create game
      return createSinglePlayerGame(userId, 'You', GameType.SinglePlayer, deck, cardBackId, battleMapIndexesToSampleFrom, aiPlayerId, aiUsername, aiGeneralId, null, aiDifficulty, aiNumRandomCards, null, gameSetupOptions);
    })
    .then((responseData) => // send data back to the player
      res.status(200).json(responseData))
    .catch(onType(Errors.InvalidDeckError, function (error) {
      Logger.module('SINGLE PLAYER').debug(`Request ${userId} : attempting to use invalid deck!`.red);
      return res.status(400).json({ error: error.message });
    }))
    .catch(onType(Errors.SinglePlayerModeDisabledError, function (error) {
      Logger.module('SINGLE PLAYER').debug(`Request ${userId} : attempting to use invalid deck!`.red);
      return res.status(400).json({ error: error.message });
    }))
    .catch(function (error) {
      Logger.module('SINGLE PLAYER').error(`ERROR: Request.post /single_player ${userId} failed!`.red);
      return next(error);
    });
});

router.post('/boss_battle', function (req, res, next) {
  const result = t.validate(req.body, validators.bossBattleInput);
  if (!result.isValid()) {
    return res.status(400).json(result.errors);
  }

  const userId = req.user.d.id;
  let {
    deck,
  } = result.value;
  const {
    cardBackId,
  } = result.value;
  const {
    battleMapId,
  } = result.value;
  const {
    ai_username,
  } = result.value;

  // re-map deck for correct formatting and anti-cheat
  deck = _.map(deck, function (card) {
    if (_.isString(card) || _.isNumber(card)) {
      return { id: card };
    } else if (card.id != null) {
      return { id: card.id };
    }
  });

  // validate deck
  return Promise.all([
    // check whether user is allowed to use this deck
    UsersModule.isAllowedToUseDeck(userId, deck, GameType.BossBattle, null),
    // check whether user is allowed to use this card back
    ((cardBackId != null) ? InventoryModule.isAllowedToUseCosmetic(Promise.resolve(), knex, userId, cardBackId) : Promise.resolve()),
    ((battleMapId != null) ? InventoryModule.isAllowedToUseCosmetic(Promise.resolve(), knex, userId, battleMapId) : Promise.resolve()),
  ])
    .bind({})
    .then(function () {
    // TODO: get current boss general id and deck id from firebase
      const aiGeneralId = result.value.ai_general_id;
      const aiDeckId = aiGeneralId;

      // setup ai username from general name
      const aiPlayerId = CONFIG.AI_PLAYER_ID;
      const aiGeneralCard = GameSession.getCardCaches().getCardById(aiGeneralId);
      const aiUsername = ai_username || (aiGeneralCard != null ? aiGeneralCard.getName() : undefined) || 'Opponent';

      // get custom game setup options for boss
      const gameSetupOptions = GameSetups[aiGeneralId];

      // create game
      return createSinglePlayerGame(userId, 'You', GameType.BossBattle, deck, cardBackId, battleMapId, aiPlayerId, aiUsername, aiGeneralId, aiDeckId, 1.0, 0, null, gameSetupOptions);
    }).then((responseData) => // send data back to the player
      res.status(200).json(responseData))
    .catch(onType(Errors.InvalidDeckError, function (error) {
      Logger.module('BOSS BATTLE').debug(`Request ${userId} : attempting to use invalid deck!`.red);
      return res.status(400).json({ error: error.message });
    }))
    .catch(onType(Errors.SinglePlayerModeDisabledError, function (error) {
      Logger.module('BOSS BATTLE').debug(`Request ${userId} : attempting to use invalid deck!`.red);
      return res.status(400).json({ error: error.message });
    }))
    .catch(function (error) {
      Logger.module('BOSS BATTLE').error(`ERROR: Request.post /boss_battle ${userId} failed!`.red);
      return next(error);
    });
});

router.post('/share_replay', function (req, res, next) {
  let game_id = t.validate(req.body.game_id, t.subtype(t.Str, (s) => s.length <= 36));
  if (!game_id.isValid()) {
    return next();
  }

  const user_id = req.user.d.id;
  game_id = game_id.value;

  return GamesModule.shareReplay(user_id, game_id)
    .then((replayData) => res.status(200).json(replayData))
    .catch(onType(Errors.AlreadyExistsError, (e) => res.status(304).json({})))
    .catch(onType(Errors.NotFoundError, (e) => res.status(404).json(e)))
    .catch((error) => next(error));
});

module.exports = router;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
