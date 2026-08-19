/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierStunned = require('./modifierStunned');

class ModifierStunnedVanar extends ModifierStunned {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierStunnedVanar';
}
ModifierStunnedVanar.prototype.type = 'ModifierStunnedVanar';
ModifierStunnedVanar.prototype.fxResource = ['FX.Modifiers.ModifierStunnedVanar'];

module.exports = ModifierStunnedVanar;
