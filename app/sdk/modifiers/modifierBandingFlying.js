/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const ModifierBanding = require('./modifierBanding');
const ModifierBandedFlying = require('./modifierBandedFlying');

class ModifierBandingFlying extends ModifierBanding {
  static type = 'ModifierBandingFlying';

  static createContextObject(options) {
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = [ModifierBandedFlying.createContextObject()];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }
}
ModifierBandingFlying.prototype.type = 'ModifierBandingFlying';
ModifierBandingFlying.prototype.fxResource = ['FX.Modifiers.ModifierZeal', 'FX.Modifiers.ModifierFlying'];

module.exports = ModifierBandingFlying;
