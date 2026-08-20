/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');
const i18next = require('i18next');

class EarlyFeb2018LoginAchievement extends Achievement {
  declare static title: any;
  declare static description: any;
  declare static rewards: any;

  static id = 'earlyFeb2018LoginAchievement';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if (
      currentLoginMoment !== null &&
      currentLoginMoment.isAfter(moment.utc('2018-01-29')) &&
      currentLoginMoment.isBefore(moment.utc('2018-03-01'))
    ) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2018-01-29');
  }
}
EarlyFeb2018LoginAchievement.title = i18next.t(
  'achievements.early_feb_2018_login_achievement_title',
);
EarlyFeb2018LoginAchievement.description = i18next.t(
  'achievements.early_feb_2018_login_achievement_desc',
);
EarlyFeb2018LoginAchievement.rewards = { giftChests: [GiftCrateLookup.EarlyFebruary2018Login] };

module.exports = EarlyFeb2018LoginAchievement;
