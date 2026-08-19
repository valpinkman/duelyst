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

class QuestSeasonal2017February extends Quest {
  declare isReplaceable: any;
  declare cosmeticKeys: any;
  declare rewardDetails: any;

  static Identifier = 30002;

  constructor() {
    super(QuestSeasonal2017February.Identifier, 'Monthly Quest', [QuestType.Seasonal]);
    this.params.completionProgress = 15;
  }

  progressForQuestCompletion() {
    return 1;
  }

  getDescription() {
    return `Complete ${this.params.completionProgress} quests.`;
  }

  isAvailableOn(momentUtc) {
    return momentUtc.isAfter(moment.utc('2017-02-01')) && momentUtc.isBefore(moment.utc('2017-03-01'));
  }
}
QuestSeasonal2017February.prototype.isReplaceable = false;
QuestSeasonal2017February.prototype.cosmeticKeys = [CosmeticsChestTypeLookup.Common];
QuestSeasonal2017February.prototype.rewardDetails = '1 Common Crate Key.';

module.exports = QuestSeasonal2017February;
