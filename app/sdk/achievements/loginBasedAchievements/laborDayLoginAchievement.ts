/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');
const i18next = require('i18next');

class LaborDayLoginAchievement extends Achievement {
  declare static rewards: any;

  static id = 'laborDayLoginAchievement';
  static title = 'HAPPY LABOR DAY';
  static description = "HERE'S 3 IMMORTAL ORBS TO CELEBRATE";
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if (
      currentLoginMoment !== null &&
      currentLoginMoment.isAfter(moment.utc('2018-08-31T11:00-07:00')) &&
      currentLoginMoment.isBefore(moment.utc('2018-09-07T11:00-07:00'))
    ) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2018-08-31T11:00-07:00');
  }
}
LaborDayLoginAchievement.rewards = { giftChests: [GiftCrateLookup.LaborDayLogin] };

module.exports = LaborDayLoginAchievement;
