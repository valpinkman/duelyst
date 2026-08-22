/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const moment = require('moment');

// This achievement exists so we can give new players a head start on their collection.
class NewPlayerGoldLoginAchievement extends Achievement {
  static id = 'newPlayerGoldLoginAchievement';
  static title = 'Welcome to Duelyst!';
  static description = 'Use Gold to buy Spirit Orbs.';
  static progressRequired = 1;
  static rewards = { gold: 2500 };
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    return 1;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2022-10-28T00:00-00:00');
  }
}

module.exports = NewPlayerGoldLoginAchievement;
