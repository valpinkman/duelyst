/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const QuestBeginner = require('./questBeginner');
const QuestType = require('./questTypeLookup');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const GameType = require('app/sdk/gameType');

class QuestBeginnerWinThreeQuickMatches extends QuestBeginner {
  declare isRequired: any;

  static Identifier = 9908;

  // TODO: needs to unlock codex somehow
  constructor() {
    super(
      QuestBeginnerWinThreeQuickMatches.Identifier,
      'Lore master',
      [QuestType.Beginner],
      QuestBeginnerWinThreeQuickMatches.prototype.goldReward,
    );
    this.params.completionProgress = 3;
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
        gameData.gameType === GameType.Casual
      ) {
        return 1;
      }
    }
    return 0;
  }

  getDescription() {
    return `Win ${this.params.completionProgress} games in Quick Match.`;
  }
}
QuestBeginnerWinThreeQuickMatches.prototype.isRequired = false;

module.exports = QuestBeginnerWinThreeQuickMatches;
