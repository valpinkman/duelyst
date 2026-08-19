/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Quest = require('./quest');
const GameStatus = require('app/sdk/gameStatus');
const GameType = require('app/sdk/gameType');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');
const CosmeticsChestTypeLookup = require('app/sdk/cosmetics/cosmeticsChestTypeLookup');
const QuestType = require('./questTypeLookup');
const moment = require('moment');

class QuestSeasonal2017March extends Quest {
  static Identifier = 30003;

  constructor() {
    super(QuestSeasonal2017March.Identifier, 'Monthly Quest', [QuestType.Seasonal]);
    this.params.completionProgress = 15;
  }

  progressForQuestCompletion() {
    return 1;
  }

  getDescription() {
    return `Complete ${this.params.completionProgress} quests.`;
  }

  isAvailableOn(momentUtc) {
    return momentUtc.isAfter(moment.utc('2017-03-01')) && momentUtc.isBefore(moment.utc('2017-04-01'));
  }
}
QuestSeasonal2017March.prototype.isReplaceable = false;
QuestSeasonal2017March.prototype.cosmeticKeys = [CosmeticsChestTypeLookup.Common];
QuestSeasonal2017March.prototype.rewardDetails = '1 Common Crate Key.';

module.exports = QuestSeasonal2017March;
