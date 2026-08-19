/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');
const i18next = require('i18next');

class ThanksgivingLoginAchievement extends Achievement {
  static id = 'thanksgivingLoginAchievement';
  static title = 'HAPPY THANKSGIVING';
  static description = 'WE\'RE THANKFUL TODAY FOR OUR LOVING FANS, SO WE\'RE GIVING BACK WITH A SPECIAL GIFT';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if ((currentLoginMoment !== null) && currentLoginMoment.isAfter(moment.utc('2018-11-16T11:00-08:00')) && currentLoginMoment.isBefore(moment.utc('2018-11-23T11:00-08:00'))) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2018-11-16T11:00-08:00');
  }
}
ThanksgivingLoginAchievement.rewards = { giftChests: [GiftCrateLookup.ThanksgivingLogin] };

module.exports = ThanksgivingLoginAchievement;
