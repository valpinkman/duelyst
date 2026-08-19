/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const i18next = require('i18next');

// Make your first real-money purchase at the THE ARMORY.

class NamasteAchievement extends Achievement {
  static id = 'namaste';
  static progressRequired = 1;
  static rewards = { gold: 100 };
  static enabled = false;

  static progressForArmoryTransaction(armoryTransactionSku) {
    if (armoryTransactionSku.indexOf('BOOSTER') !== -1) {
      return 1;
    }
    return 0;
  }
}
NamasteAchievement.title = i18next.t('achievements.namaste_title');
NamasteAchievement.description = i18next.t('achievements.namaste_desc');

module.exports = NamasteAchievement;
