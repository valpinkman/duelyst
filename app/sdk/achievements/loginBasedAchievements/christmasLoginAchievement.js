/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');
const i18next = require('i18next');

class ChristmasLoginAchievement extends Achievement {
  static id = 'christmasLoginAchievement';
  static title = 'HAPPY WINTER HOLIDAYS';
  static description = 'ALL THE SNOWCHASERS HAVE GONE OUT TO PLAY, SO TAKE THESE GIFTS TO CELEBRATE THIS SPECIAL DAY';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if ((currentLoginMoment !== null) && currentLoginMoment.isAfter(moment.utc('2018-12-21T11:00-08:00')) && currentLoginMoment.isBefore(moment.utc('2018-12-28T11:00-08:00'))) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2018-12-21T11:00-08:00');
  }
}
ChristmasLoginAchievement.rewards = { giftChests: [GiftCrateLookup.ChristmasLogin] };

module.exports = ChristmasLoginAchievement;
