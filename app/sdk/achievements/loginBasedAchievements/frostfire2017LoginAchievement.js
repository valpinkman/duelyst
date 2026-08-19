/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');

class Frostfire2017LoginAchievement extends Achievement {
  static id = 'frostfire2017LoginAchievement';
  static title = 'Frostfire Festival Has Arrived!';
  static description = 'Here\'s a special Frostfire Loot Crate full of festive goodies.';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if ((currentLoginMoment !== null) && currentLoginMoment.isAfter(moment.utc('2017-11-29')) && currentLoginMoment.isBefore(moment.utc('2017-12-22'))) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2017-11-29');
  }
}
Frostfire2017LoginAchievement.rewards = {
  giftChests: [
    GiftCrateLookup.FrostfirePurchasable2017,
  ],
};

module.exports = Frostfire2017LoginAchievement;
