/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const i18next = require('i18next');

class SilverDivisionAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'silverDivisionAchievement';
  static progressRequired = 1;
  static rewards = { spiritOrb: 1 };
  static enabled = false;

  static progressForAchievingRank(rank) {
    if (rank <= 20) {
      return 1;
    }
    return 0;
  }
}
SilverDivisionAchievement.title = i18next.t('achievements.silver_division_title');
SilverDivisionAchievement.description = i18next.t('achievements.silver_division_desc');

module.exports = SilverDivisionAchievement;
