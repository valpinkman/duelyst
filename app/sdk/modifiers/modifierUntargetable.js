/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierUntargetable extends Modifier {
  static type = 'ModifierUntargetable';
}
ModifierUntargetable.prototype.type = 'ModifierUntargetable';
ModifierUntargetable.modifierName = i18next.t('modifiers.untargetable_name');
ModifierUntargetable.description = i18next.t('modifiers.untargetable_def');
ModifierUntargetable.prototype.maxStacks = 1;

module.exports = ModifierUntargetable;
