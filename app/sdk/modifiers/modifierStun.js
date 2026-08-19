/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierStunned = require('./modifierStunned');

class ModifierStun extends ModifierStunned {
  static type = 'ModifierStun';
  static modifierName = 'Stun';
}
ModifierStun.prototype.type = 'ModifierStun';

module.exports = ModifierStun;
