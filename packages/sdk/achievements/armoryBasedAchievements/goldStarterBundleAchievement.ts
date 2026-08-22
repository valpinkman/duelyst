/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const i18next = require('i18next');

class ShopAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'gold_special_purchased';
  static progressRequired = 1;
  static rewards = {
    cards: [
      {
        rarity: 4,
        count: 3,
        cardSet: 1,
        factionId: [1, 2, 3, 4, 5, 6],
      },
    ],
  };

  static enabled = true;

  static progressForArmoryTransaction(armoryTransactionSku) {
    if (armoryTransactionSku.indexOf('GOLD_DIVISION_STARTER_SPECIAL') !== -1) {
      return 1;
    }
    return 0;
  }
}
ShopAchievement.title = i18next.t('achievements.gold_starter_bundle_title');
ShopAchievement.description = i18next.t('achievements.gold_starter_bundle_desc');

module.exports = ShopAchievement;
