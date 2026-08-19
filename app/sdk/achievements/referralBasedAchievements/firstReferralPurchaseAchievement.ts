/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const CosmeticsLookup = require('app/sdk/cosmetics/cosmeticsLookup');
const i18next = require('i18next');
// One your referrals makes a first real-money purchase at the THE ARMORY.

class FirstReferralPurchase extends Achievement {
  declare static title: any;
  declare static description: any;
  declare static rewards: any;

  static id = 'first_referral_purchase';
  static progressRequired = 1;
  static enabled = true;

  static progressForReferralEvent(eventType) {
    if (eventType === 'purchase') {
      return 1;
    }
    return 0;
  }
}
FirstReferralPurchase.title = i18next.t('achievements.referral_title');
FirstReferralPurchase.description = i18next.t('achievements.referral_desc');
FirstReferralPurchase.rewards = { cosmetics: [CosmeticsLookup.Emote.OtherRook] };

module.exports = FirstReferralPurchase;
