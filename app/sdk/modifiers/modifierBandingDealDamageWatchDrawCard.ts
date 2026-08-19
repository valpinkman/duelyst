/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const i18next = require('i18next');
const ModifierBanding = require('./modifierBanding');
const ModifierDealDamageWatchDrawCard = require('./modifierDealDamageWatchDrawCard');

class ModifierBandingDealDamageWatchDrawCard extends ModifierBanding {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierBandingDealDamageWatchDrawCard';
  static description = '';

  static createContextObject(options) {
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.appliedName = i18next.t('modifiers.banding_deal_damage_watch_draw_card_name');
    const bandedContextObject = ModifierDealDamageWatchDrawCard.createContextObject();
    bandedContextObject.appliedName = i18next.t('modifiers.banding_deal_damage_watch_draw_card_name');
    contextObject.modifiersContextObjects = [bandedContextObject];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }
}
ModifierBandingDealDamageWatchDrawCard.prototype.type = 'ModifierBandingDealDamageWatchDrawCard';
ModifierBandingDealDamageWatchDrawCard.prototype.fxResource = ['FX.Modifiers.ModifierZeal'];

module.exports = ModifierBandingDealDamageWatchDrawCard;
