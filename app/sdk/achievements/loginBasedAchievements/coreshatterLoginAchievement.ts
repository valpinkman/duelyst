/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const moment = require('moment');
const GiftCrateLookup = require('app/sdk/giftCrates/giftCrateLookup');
const i18next = require('i18next');

class CoreshatterLoginAchievement extends Achievement {
  declare static rewards: any;

  static id = 'coreshatterLoginAchievement';
  static title = 'Trials of Mythron Expansion Launch';
  static description = 'Enjoy 3 Trials of Mythron Spirit Orbs to kickstart your collection!';
  static progressRequired = 1;
  static enabled = true;

  static progressForLoggingIn(currentLoginMoment) {
    if ((currentLoginMoment !== null) && currentLoginMoment.isAfter(moment.utc('2018-03-14')) && currentLoginMoment.isBefore(moment.utc('2018-04-30'))) {
      return 1;
    }
    return 0;
  }

  static getLoginAchievementStartsMoment() {
    return moment.utc('2018-03-14');
  }
}
CoreshatterLoginAchievement.rewards = { giftChests: [GiftCrateLookup.CoreshatterLogin] };

module.exports = CoreshatterLoginAchievement;
