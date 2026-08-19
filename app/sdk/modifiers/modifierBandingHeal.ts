/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const i18next = require('i18next');
const ModifierBanding = require('./modifierBanding');
const ModifierBandedHeal = require('./modifierBandedHeal');

class ModifierBandingHeal extends ModifierBanding {
  declare type: any;
  declare maxStacks: any;
  declare fxResource: any;

  static type = 'ModifierBandingHeal';

  static createContextObject(options) {
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.appliedName = i18next.t('modifiers.banding_heal_applied_name');
    const bandedContextObject = ModifierBandedHeal.createContextObject();
    bandedContextObject.appliedName = i18next.t('modifiers.banded_heal_applied_name');
    contextObject.modifiersContextObjects = [bandedContextObject];
    return contextObject;
  }
}
ModifierBandingHeal.prototype.type = 'ModifierBandingHeal';
ModifierBandingHeal.prototype.maxStacks = 1;
ModifierBandingHeal.prototype.fxResource = ['FX.Modifiers.ModifierZeal', 'FX.Modifiers.ModifierZealHeal'];

module.exports = ModifierBandingHeal;
