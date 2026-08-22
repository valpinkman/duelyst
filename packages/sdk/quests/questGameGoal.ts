/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Quest = require('./quest');
const GameStatus = require('@duelyst/sdk/gameStatus');
const GameType = require('@duelyst/sdk/gameType');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');

/*
  QuestGameGoal - creates a quest that makes progress through a goalTester
*/

class QuestGameGoal extends Quest {
  declare description: any;
  declare goalTester: any;

  // numGamesRequiredToSatisfyQuest - how many times the goal must be met to award quest gold
  constructor(id, name, typesIn, reward, numGamesRequiredToSatisfyQuest, description, goalTester) {
    super(id, name, typesIn, reward);
    this.params.completionProgress = numGamesRequiredToSatisfyQuest;
    this.description = description;
    this.goalTester = goalTester;
  }

  _progressForGameDataForPlayerId(gameData, playerId) {
    for (var player of Array.from<any>(gameData.players)) {
      var playerSetupData = UtilsGameSession.getPlayerSetupDataForPlayerId(
        gameData,
        player.playerId,
      );
      if (player.playerId === playerId && GameType.isCompetitiveGameType(gameData.gameType)) {
        return this.goalTester(gameData, playerId);
      }
    }
    return 0;
  }

  getDescription() {
    return this.description;
  }
}
QuestGameGoal.prototype.description = undefined;
QuestGameGoal.prototype.goalTester = undefined;

module.exports = QuestGameGoal;
