/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');
const i18next = require('i18next');

class MemorialDayLoginAchievement extends Achievement {
  static id = 'memorialDayLoginAchievement';
  static title = 'HAPPY MEMORIAL DAY';
  static description = 'HERE\'S 3 CORE ORBS TO CELEBRATE';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if ((currentLoginMoment !== null) && currentLoginMoment.isAfter(moment.utc('2018-05-25T11:00-07:00')) && currentLoginMoment.isBefore(moment.utc('2018-06-01T11:00-07:00'))) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2018-05-25T11:00-07:00');
  }
}
MemorialDayLoginAchievement.rewards = { giftChests: [GiftCrateLookup.MemorialDayLogin] };

module.exports = MemorialDayLoginAchievement;
