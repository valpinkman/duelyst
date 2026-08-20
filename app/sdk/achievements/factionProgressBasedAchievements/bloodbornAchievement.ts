/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const i18next = require('i18next');

class BloodbornAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'bloodborn';
  static progressRequired = 1;
  static rewards = { spiritOrb: 1 };
  static enabled = false;

  // returns progress made by reaching a state of faction progression
  static progressForFactionProgression(factionProgressionData) {
    // 9 is the faction level at which players have unlocked all cards for a faction
    for (var factionId in factionProgressionData) {
      var factionData = factionProgressionData[factionId];
      if (factionData && factionData.stats && factionData.stats.level === 9) {
        return 1;
      }
    }

    // No factions are level 9 so no progress is made
    return 0;
  }
}
BloodbornAchievement.title = i18next.t('achievements.bloodborn_title');
BloodbornAchievement.description = i18next.t('achievements.bloodborn_desc');

module.exports = BloodbornAchievement;
