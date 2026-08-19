/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const QuestBeginner = require('./questBeginner');
const QuestType = require('./questTypeLookup');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const GameType = require('app/sdk/gameType');
const i18next = require('i18next');

class QuestBeginnerWinOneSeasonGame extends QuestBeginner {
  static Identifier = 9910;

  constructor() {
    super(QuestBeginnerWinOneSeasonGame.Identifier, i18next.t('quests.quest_beginner_win_ladder_game_title'), [QuestType.Beginner], QuestBeginnerWinOneSeasonGame.prototype.goldReward);
    this.params.completionProgress = 1;
  }

  _progressForGameDataForPlayerId(gameData, playerId) {
    for (var player of Array.from<any>(gameData.players)) {
      var playerSetupData = UtilsGameSession.getPlayerSetupDataForPlayerId(gameData, player.playerId);
      if ((player.playerId === playerId) && player.isWinner && ((gameData.gameType === GameType.Casual) || (gameData.gameType === GameType.Ranked))) {
        return 1;
      }
    }
    return 0;
  }

  getDescription() {
    return i18next.t('quests.quest_beginner_win_ladder_game_desc', { count: this.params.completionProgress });
  }
}
// return "Win #{@params["completionProgress"]} Season Ladder Game."

module.exports = QuestBeginnerWinOneSeasonGame;
