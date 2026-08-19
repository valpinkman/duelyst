/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const ModifierBanding = require('./modifierBanding');
const ModifierBandedProvoke = require('./modifierBandedProvoke');

class ModifierBandingProvoke extends ModifierBanding {
  static type = 'ModifierBandingProvoke';

  static createContextObject(options) {
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = [ModifierBandedProvoke.createContextObject()];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }
}
ModifierBandingProvoke.prototype.type = 'ModifierBandingProvoke';

module.exports = ModifierBandingProvoke;
