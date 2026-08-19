/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const QuestBeginner = require('./questBeginner');
const QuestType = require('./questTypeLookup');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const GameType = require('app/sdk/gameType');

class QuestBeginnerPlayOneQuickMatch extends QuestBeginner {
  static Identifier = 9903;

  constructor() {
    super(QuestBeginnerPlayOneQuickMatch.Identifier, 'Into the Fray', [QuestType.Beginner], QuestBeginnerPlayOneQuickMatch.prototype.goldReward);
    this.params.completionProgress = 1;
  }

  _progressForGameDataForPlayerId(gameData, playerId) {
    for (var player of Array.from(gameData.players)) {
      var playerSetupData = UtilsGameSession.getPlayerSetupDataForPlayerId(gameData, player.playerId);
      if ((player.playerId === playerId) && (gameData.gameType === GameType.Casual)) {
        return 1;
      }
    }
    return 0;
  }

  getDescription() {
    return `Play ${this.params.completionProgress} Quick Match.`;
  }
}

module.exports = QuestBeginnerPlayOneQuickMatch;
