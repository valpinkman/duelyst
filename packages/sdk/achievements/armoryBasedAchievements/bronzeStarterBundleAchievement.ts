/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const CardsLookup = require('@duelyst/sdk/cards/cardsLookup');
const i18next = require('i18next');

class ShopAchievement extends Achievement {
  declare static title: any;
  declare static description: any;
  declare static rewards: any;

  static id = 'bronze_special_purchased';
  static progressRequired = 1;
  static enabled = true;

  static progressForArmoryTransaction(armoryTransactionSku) {
    if (armoryTransactionSku.indexOf('BRONZE_DIVISION_STARTER_SPECIAL') !== -1) {
      return 1;
    }
    return 0;
  }
}
ShopAchievement.title = i18next.t('achievements.bronze_starter_bundle_title');
ShopAchievement.description = i18next.t('achievements.bronze_starter_bundle_desc');
ShopAchievement.rewards = {
  cards: [
    {
      rarity: 4,
      count: 3,
      cardSet: 1,
      sample: [
        CardsLookup.Neutral.Pandora,
        CardsLookup.Neutral.Spelljammer,
        CardsLookup.Neutral.ArchonSpellbinder,
        CardsLookup.Neutral.RedSynja,
        CardsLookup.Neutral.DarkNemesis,
        CardsLookup.Neutral.JaxTruesight,
      ],
      factionId: [100],
    },
  ],
};

module.exports = ShopAchievement;
