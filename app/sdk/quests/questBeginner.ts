/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Quest = require('./quest');
const QuestType = require('./questTypeLookup');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const GameType = require('app/sdk/gameType');

class QuestBeginner extends Quest {
  declare isReplaceable: any;
  declare isRequired: any;
  declare isBeginner: any;
  declare goldReward: any;

  constructor() {
    super(...arguments);
    if (Math.floor(this.id / 100) !== 99) {
      throw new Error('Invalid Beginner Quest ID');
    }
  }
}
QuestBeginner.prototype.isReplaceable = false;
QuestBeginner.prototype.isRequired = true;
QuestBeginner.prototype.isBeginner = true;
QuestBeginner.prototype.goldReward = 150;

module.exports = QuestBeginner;
