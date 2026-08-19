/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');

// This achievement exists so we can give new players a head start on their collection.
class NewPlayerSpiritLoginAchievement extends Achievement {
  static id = 'newPlayerSpiritLoginAchievement';
  static title = 'Welcome to Duelyst!';
  static description = 'Use Spirit to craft cards in the Collection menu.';
  static progressRequired = 1;
  static rewards = { spirit: 50000 };
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    return 1;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2022-10-28T00:00-00:00');
  }
}

module.exports = NewPlayerSpiritLoginAchievement;
