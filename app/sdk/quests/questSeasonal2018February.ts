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
const i18next = require('i18next');
const moment = require('moment');

class QuestSeasonal2018February extends Quest {
  declare isReplaceable: any;
  declare cosmeticKeys: any;
  declare rewardDetails: any;

  static Identifier = 30007;

  constructor() {
    super(QuestSeasonal2018February.Identifier, i18next.t('quests.monthly_quest_title'), [
      QuestType.Seasonal,
    ]);
    this.params.completionProgress = 15;
  }

  progressForQuestCompletion() {
    return 1;
  }

  getDescription() {
    return i18next.t('quests.monthly_quest_desc', { count: this.params.completionProgress });
  }

  isAvailableOn(momentUtc) {
    return (
      momentUtc.isAfter(moment.utc('2018-01-30')) && momentUtc.isBefore(moment.utc('2018-03-01'))
    );
  }
}
QuestSeasonal2018February.prototype.isReplaceable = false;
QuestSeasonal2018February.prototype.cosmeticKeys = [CosmeticsChestTypeLookup.Rare];
QuestSeasonal2018February.prototype.rewardDetails = '1 Rare Crate Key.';

module.exports = QuestSeasonal2018February;
