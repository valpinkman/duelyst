/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('@duelyst/sdk/giftCrates/giftCrateLookup');

class MidAugLoginAchievement extends Achievement {
  declare static rewards: any;

  static id = 'midAugLoginAchievement';
  static title = 'Thanks for playing Duelyst';
  static description = 'Enjoy 3 Unearthed Prophecy Spirit Orbs on us for being a great community!';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if (
      currentLoginMoment !== null &&
      currentLoginMoment.isAfter(moment.utc('2017-08-15')) &&
      currentLoginMoment.isBefore(moment.utc('Thu Aug 31 2017 18:00:00 GMT+0000'))
    ) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2017-08-15');
  }
}
MidAugLoginAchievement.rewards = { giftChests: [GiftCrateLookup.MidAugust2017Login] };

module.exports = MidAugLoginAchievement;
