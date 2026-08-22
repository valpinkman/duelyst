/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// # ALL LOGIC FOR CREATING A GAME HERE
// # SHOULD BE PLACE WHERE SDK IS USED
const SDK = require('@duelyst/sdk');
const RSX = require('@duelyst/data/resources.js');
const Logger = require('@duelyst/common/logger');
const _ = require('underscore');
const request = require('superagent');
const config = require('@duelyst/config');
const moment = require('moment');
const GamesModule = require('../server/lib/data_access/games');
const { GameManager } = require('../server/redis');
const fs = require('fs');
const PromiseUtils = require('@duelyst/common/utils/utils_promise');

const { version } = JSON.parse(fs.readFileSync('./version.json'));

const env = config.get('env');

const createGame = function (gameType, player1Data, player2Data, gameServer, callback) {
  const _chainState: Record<string, any> = {};
  let error, newGameSession;
  let player1DataForGame = player1Data;
  let player2DataForGame = player2Data;

  // make it random who goes first
  // swap player 1/2 data
  if (Math.random() >= 0.5) {
    const tmp = player1DataForGame;
    player1DataForGame = player2DataForGame;
    player2DataForGame = tmp;
  }

  // TODO : check for valid IDs / names
  const player1Id = player1DataForGame != null ? player1DataForGame.userId : undefined;
  const player1Name = player1DataForGame != null ? player1DataForGame.name : undefined;
  const player2Id = player2DataForGame != null ? player2DataForGame.userId : undefined;
  const player2Name = player2DataForGame != null ? player2DataForGame.name : undefined;

  // if we are trying to create a game where the player is on both sides, or any of the two player IDs is not defined, we have an issue
  if (player1Id === player2Id || player1Id == null || player2Id == null) {
    Logger.module('GAME CREATE').error(
      `ERROR Creating a game for ${player1Id} and ${player2Id}. Invalid data.`.red,
    );

    error = new Error('Could not create a game because one or both the player IDs are invalid');

    // send the error along to the callback
    return Promise.reject(error);
  }

  Logger.module('GAME CREATE').debug(
    `Setting up game for user ${player1Name} and user ${player2Name} on ${gameServer}`,
  );

  // try to setup GameSession
  try {
    // create GameSession
    newGameSession = SDK.GameSession.create();
    newGameSession.gameType = gameType;
    newGameSession.gameFormat = SDK.GameType.getGameFormatForGameType(gameType);
    // modify "casual" games to create holiday game mode
    // if gameType is SDK.GameType.Casual
    //   # setup cards on board
    //   player1DataForGame.battleMapIndexes = [10] # force game to be played on Vanar battlemap
    //   # add spell to game that creates logic for custom game mode
    //   player1DataForGame.startingBoardCardsData ?= []
    //   player1DataForGame.startingBoardCardsData.push({
    //     id: SDK.Cards.Spell.FestiveSpirit
    //     position: {x: 0, y: 0}
    //     })
    newGameSession.version = version;
    newGameSession.setIsRunningAsAuthoritative(true);
    SDK.GameSetup.setupNewSession(newGameSession, player1DataForGame, player2DataForGame);
  } catch (error1) {
    error = error1;
    Logger.module('GAME CREATE').error(
      `ERROR: setting up GameSession: ${JSON.stringify(error.message)}`.red,
    );
    Logger.module('GAME CREATE').error(error.stack);
    return Promise.reject(error);
  }

  const createdDate = moment().utc().valueOf();
  newGameSession.createdAt = createdDate;
  newGameSession.gameServer = gameServer;

  return PromiseUtils.nodeify(GameManager.generateGameId(), callback)
    .then(function (gameId) {
      _chainState.gameId = gameId;
      Logger.module('GAME CREATE').debug(`Unique game id ${gameId}`);
      newGameSession.gameId = gameId;
      return GameManager.saveGameSession(gameId, newGameSession.serializeToJSON(newGameSession));
    })
    .then(function () {
      Logger.module('GAME CREATE').debug(`New game session ${_chainState.gameId} saved to Redis.`);

      const player1General = newGameSession.getGeneralForPlayer1();
      const player1SetupData = newGameSession.getPlayer1SetupData();
      const player2General = newGameSession.getGeneralForPlayer2();
      const player2SetupData = newGameSession.getPlayer2SetupData();

      // setup player data
      const gameDataForPlayer1 = {
        game_type: player1DataForGame.gameType,
        game_id: _chainState.gameId,
        is_player_1: true,
        opponent_username: player2DataForGame.name,
        opponent_id: player2DataForGame.userId,
        opponent_faction_id: player2SetupData.factionId,
        opponent_general_id: player2General.getId(),
        status: SDK.GameStatus.active,
        created_at: createdDate,
        faction_id: player1SetupData.factionId,
        general_id: player1General.getId(),
        game_server: gameServer,
        game_version: version,
        deck_cards: _.map(player1DataForGame.deck, (c) => c.id),
        rift_ticket_id: player1DataForGame.ticketId,
      };

      const gameDataForPlayer2 = {
        game_type: player2DataForGame.gameType,
        game_id: _chainState.gameId,
        is_player_1: false,
        opponent_username: player1DataForGame.name,
        opponent_id: player1DataForGame.userId,
        opponent_faction_id: player1SetupData.factionId,
        opponent_general_id: player1General.getId(),
        status: SDK.GameStatus.active,
        created_at: createdDate,
        faction_id: player2SetupData.factionId,
        general_id: player2General.getId(),
        game_server: gameServer,
        game_version: version,
        deck_cards: _.map(player2DataForGame.deck, (c) => c.id),
        rift_ticket_id: player2DataForGame.ticketId,
      };

      // Add newly created gameId to each users list of games
      return Promise.all([
        GamesModule.newUserGame(player1DataForGame.userId, _chainState.gameId, gameDataForPlayer1),
        GamesModule.newUserGame(player2DataForGame.userId, _chainState.gameId, gameDataForPlayer2),
        // WARNING: this code below is for testing timeouts only
        // new Promise (resolve)-> setTimeout( (()-> resolve()), 16000)
      ]);
    })
    .then(function () {
      Logger.module('GAME CREATE').debug(
        `Game session ${_chainState.gameId} added to each user's list of games.`,
      );
      return _chainState.gameId;
    });
};

module.exports = createGame;
