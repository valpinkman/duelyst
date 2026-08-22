/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Quest = require('./quest');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const GameType = require('@duelyst/sdk/gameType');

class QuestWinWithFaction extends Quest {
  declare factionId: any;
  declare factionName: any;

  constructor(id, name, typesIn, reward, factionId, factionName) {
    super(id, name, typesIn, reward);
    this.factionId = factionId;
    this.factionName = factionName;
    this.params.factionId = this.factionId;
    this.params.completionProgress = 2;
  }

  _progressForGameDataForPlayerId(gameData, playerId) {
    for (var player of Array.from<any>(gameData.players)) {
      var playerSetupData = UtilsGameSession.getPlayerSetupDataForPlayerId(
        gameData,
        player.playerId,
      );
      if (
        player.playerId === playerId &&
        player.isWinner &&
        playerSetupData.factionId === this.getFactionId() &&
        GameType.isCompetitiveGameType(gameData.gameType)
      ) {
        return 1;
      }
    }
    return 0;
  }

  getFactionId() {
    return this.factionId;
  }

  getDescription() {
    return `Win ${this.params.completionProgress} games with a ${this.factionName} Deck.`;
  }
}
QuestWinWithFaction.prototype.factionId = null;
QuestWinWithFaction.prototype.factionName = null;

module.exports = QuestWinWithFaction;
