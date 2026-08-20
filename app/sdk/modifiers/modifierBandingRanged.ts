/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const ModifierBanding = require('./modifierBanding');
const ModifierBandedRanged = require('./modifierBandedRanged');

class ModifierBandingRanged extends ModifierBanding {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierBandingRanged';

  static createContextObject(options) {
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = [ModifierBandedRanged.createContextObject()];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }
}
ModifierBandingRanged.prototype.type = 'ModifierBandingRanged';
ModifierBandingRanged.prototype.fxResource = [
  'FX.Modifiers.ModifierZeal',
  'FX.Modifiers.ModifierZealRanged',
];

module.exports = ModifierBandingRanged;
