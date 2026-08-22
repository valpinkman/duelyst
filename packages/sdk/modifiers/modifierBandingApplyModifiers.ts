/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const ModifierBanding = require('./modifierBanding');
const ModifierBandedHeal = require('./modifierBandedHeal');

class ModifierBandingApplyModifiers extends ModifierBanding {
  declare type: any;
  declare maxStacks: any;
  declare fxResource: any;

  static type = 'ModifierBandingApplyModifiers';
  static description = 'Apply buffs';

  static createContextObject(modifiersContextObjects, description, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.description = description;
    return contextObject;
  }
}
ModifierBandingApplyModifiers.prototype.type = 'ModifierBandingApplyModifiers';
ModifierBandingApplyModifiers.prototype.maxStacks = 1;
ModifierBandingApplyModifiers.prototype.fxResource = ['FX.Modifiers.ModifierZeal'];

module.exports = ModifierBandingApplyModifiers;
