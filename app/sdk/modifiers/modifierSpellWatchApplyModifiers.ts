/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');
const ModifierSpellWatch = require('./modifierSpellWatch');

class ModifierSpellWatchApplyModifiers extends ModifierSpellWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSpellWatchApplyModifiers';
  static modifierName = 'Spell Watch';
  static description = 'Whenever you cast a spell, apply a modifier to this minion';

  static createContextObject(modifiers, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiers;
    return contextObject;
  }

  onSpellWatch(action) {
    return this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
  }
}
ModifierSpellWatchApplyModifiers.prototype.type = 'ModifierSpellWatchApplyModifiers';
ModifierSpellWatchApplyModifiers.prototype.fxResource = ['FX.Modifiers.ModifierSpellWatch', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierSpellWatchApplyModifiers;
