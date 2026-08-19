/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierBackstab = require('./modifierBackstab');

// Backstab modifier that can only stack once (this HAS backstab X rather than GAINS backstab X)

class ModifierHasBackstab extends ModifierBackstab {
  static type = 'ModifierHasBackstab';
  static isKeyworded = true;
  static description = 'Has Backstab (%X)';

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.backstabBonus);
    }
    return this.description;
  }
}
ModifierHasBackstab.prototype.type = 'ModifierHasBackstab';
ModifierHasBackstab.keywordDefinition = i18next.t('modifiers.backstab_def');
ModifierHasBackstab.prototype.maxStacks = 1;
ModifierHasBackstab.prototype.fxResource = ['FX.Modifiers.ModifierBackstab'];

module.exports = ModifierHasBackstab;
