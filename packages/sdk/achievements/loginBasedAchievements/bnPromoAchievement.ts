/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('@duelyst/sdk/giftCrates/giftCrateLookup');

class BNPromoAchievement extends Achievement {
  declare static rewards: any;

  static id = 'bnPromoAchievement';
  static title = 'BANDAI NAMCO PARTNERSHIP EVENT';
  static description = "Here's a FREE GIFT CRATE to celebrate our new partnership!";
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if (
      currentLoginMoment !== null &&
      currentLoginMoment.isAfter(moment.utc('2017-07-03')) &&
      currentLoginMoment.isBefore(moment.utc('2017-08-01'))
    ) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2017-07-01 00:01');
  }
}
BNPromoAchievement.rewards = { giftChests: [GiftCrateLookup.BNLogin2017] };

module.exports = BNPromoAchievement;
