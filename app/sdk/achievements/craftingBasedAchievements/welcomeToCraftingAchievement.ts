/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const i18next = require('i18next');

// Disenchant your first Card.

class WelcomeToCraftingAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'welcomeToCrafting';
  static progressRequired = 1;
  static rewards = { spirit: 90 };
  static enabled = false;

  static progressForDisenchanting(cardId) {
    return 1;
  }
}
WelcomeToCraftingAchievement.title = i18next.t('achievements.welcome_to_crafting_title');
WelcomeToCraftingAchievement.description = i18next.t('achievements.welcome_to_crafting_desc');

module.exports = WelcomeToCraftingAchievement;
