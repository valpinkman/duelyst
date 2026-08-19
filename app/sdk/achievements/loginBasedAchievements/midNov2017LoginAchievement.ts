/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');

class MidNov2017LoginAchievement extends Achievement {
  declare static rewards: any;

  static id = 'midNov2017LoginAchievement';
  static title = 'Immortal Vanguard Expansion Launch';
  static description = 'Enjoy 3 Immortal Vanguard Spirit Orbs to kickstart your collection!';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if ((currentLoginMoment !== null) && currentLoginMoment.isAfter(moment.utc('2017-11-09')) && currentLoginMoment.isBefore(moment.utc('2017-11-28'))) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2017-11-09');
  }
}
MidNov2017LoginAchievement.rewards = { giftChests: [GiftCrateLookup.MidNovember2017Login] };

module.exports = MidNov2017LoginAchievement;
