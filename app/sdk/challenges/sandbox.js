/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Challenge = require('./challenge');
const GameSetup = require('../gameSetup');
const GameType = require('app/sdk/gameType');
const PlayModeFactory = require('../playModes/playModeFactory');
const PlayModes = require('../playModes/playModesLookup');

class Sandbox extends Challenge {
  static type = 'Sandbox';

  setPlayer1DeckData(player1Deck) {
    return this.player1Deck = player1Deck;
  }

  getMyPlayerDeckData() {
    return this.player1Deck;
  }

  setPlayer2DeckData(player2Deck) {
    return this.player2Deck = player2Deck;
  }

  getOpponentPlayerDeckData() {
    return this.player2Deck;
  }

  setupSession(gameSession) {
    return super.setupSession(gameSession, {
      userId: gameSession.getUserId(),
      name: 'Player 1',
    }, {
      userId: `${gameSession.getUserId()}test`,
      name: 'Player 2',
    });
  }

  setupSessionModes(gameSession) {
    super.setupSessionModes(gameSession);
    return gameSession.setGameType(GameType.Sandbox);
  }

  setupOpponentAgent() {}
}
Sandbox.prototype.type = 'Sandbox';
Sandbox.prototype.name = PlayModeFactory.playModeForIdentifier(PlayModes.Sandbox).name;
Sandbox.prototype.description = PlayModeFactory.playModeForIdentifier(PlayModes.Sandbox).description;
Sandbox.prototype.battleMapTemplateIndex = null;
Sandbox.prototype.player1Deck = null;
Sandbox.prototype.player2Deck = null;
Sandbox.prototype.skipMulligan = false;
Sandbox.prototype.customBoard = false;
// no agent needed for sandbox

module.exports = Sandbox;
