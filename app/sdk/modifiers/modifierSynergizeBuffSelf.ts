/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierSynergize = require('./modifierSynergize');

class ModifierSynergizeBuffSelf extends ModifierSynergize {
  declare type: any;
  declare fxResource: any;
  declare modifiers: any;

  static type = 'ModifierSynergizeBuffSelf';

  static createContextObject(modifiers, options) {
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    contextObject.modifiers = modifiers;
    return contextObject;
  }

  onSynergize(action) {
    return this.applyManagedModifiersFromModifiersContextObjects(this.modifiers, this.getCard());
  }
}
ModifierSynergizeBuffSelf.prototype.type = 'ModifierSynergizeBuffSelf';
ModifierSynergizeBuffSelf.prototype.fxResource = ['FX.Modifiers.ModifierSynergize'];
ModifierSynergizeBuffSelf.prototype.modifiers = null;

module.exports = ModifierSynergizeBuffSelf;
