/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const CardsLookup = require('app/sdk/cards/cardsLookup');
const i18next = require('i18next');

class ShopAchievement extends Achievement {
  static id = 'silver_special_purchased';
  static progressRequired = 1;
  static enabled = true;

  static progressForArmoryTransaction(armoryTransactionSku) {
    if (armoryTransactionSku.indexOf('SILVER_DIVISION_STARTER_SPECIAL') !== -1) {
      return 1;
    }
    return 0;
  }
}
ShopAchievement.title = i18next.t('achievements.silver_starter_bundle_title');
ShopAchievement.description = i18next.t('achievements.silver_starter_bundle_desc');
ShopAchievement.rewards = {
  cards: [
    {
      rarity: 3,
      count: 3,
      cardSet: 1,
      sample: [
        CardsLookup.Neutral.TwilightMage,
        CardsLookup.Neutral.VenomToth,
        CardsLookup.Neutral.Purgatos,
        CardsLookup.Neutral.SwornAvenger,
        CardsLookup.Neutral.Dilotas,
        CardsLookup.Neutral.AlcuinLoremaster,
      ],
      factionId: [100],
    },
  ],
};

module.exports = ShopAchievement;
