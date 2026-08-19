/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');

class Frostfire2017BonusLoginAchievement extends Achievement {
  static id = 'Frostfire2017BonusLoginAchievement';
  static title = 'It\'s the most festive time of the season!';
  static description = 'Here\'s 2 special Frostfire Loot Crates full of festive goodies.';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if ((currentLoginMoment !== null) && currentLoginMoment.isAfter(moment.utc('2017-12-25')) && currentLoginMoment.isBefore(moment.utc('2018-01-04'))) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2017-12-25');
  }
}
Frostfire2017BonusLoginAchievement.rewards = {
  giftChests: [
    GiftCrateLookup.FrostfirePurchasable2017,
    GiftCrateLookup.FrostfirePurchasable2017,
  ],
};

module.exports = Frostfire2017BonusLoginAchievement;
