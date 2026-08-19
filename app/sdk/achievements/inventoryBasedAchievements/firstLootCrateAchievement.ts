/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const CardFactory = require('app/sdk/cards/cardFactory');
const Factions = require('app/sdk/cards/factionsLookup');
const GameSession = require('app/sdk/gameSession');
const RarityLookup = require('app/sdk/cards/rarityLookup');
const CosmeticsChestTypeLookup = require('app/sdk/cosmetics/cosmeticsChestTypeLookup');
const i18next = require('i18next');

const _ = require('underscore');

class FirstCosmeticChestAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'firstCosmeticChestAchievement';
  static progressRequired = 1;
  static rewards = { bronzeCrateKey: 1 };

  // returns progress made by receiving a loot crate
  static progressForReceivingCosmeticChest(cosmeticChestType) {
    if (cosmeticChestType === CosmeticsChestTypeLookup.Common) {
      return 1;
    }
    return 0;
  }
}
FirstCosmeticChestAchievement.title = i18next.t('achievements.key_mythron_title');
FirstCosmeticChestAchievement.description = i18next.t('achievements.key_mythron_desc');

module.exports = FirstCosmeticChestAchievement;
