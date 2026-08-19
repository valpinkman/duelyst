/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierStackingShadowsBonusDamage = require('./modifierStackingShadowsBonusDamage');

class ModifierStackingShadowsBonusDamageUnique extends ModifierStackingShadowsBonusDamage {
  static type = 'ModifierStackingShadowsBonusDamageUnique';
}
ModifierStackingShadowsBonusDamageUnique.prototype.type = 'ModifierStackingShadowsBonusDamageUnique';
ModifierStackingShadowsBonusDamageUnique.prototype.maxStacks = 1;

module.exports = ModifierStackingShadowsBonusDamageUnique;
