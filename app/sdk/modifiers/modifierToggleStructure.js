/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');
const ModifierPortal = require('./modifierPortal');

class ModifierToggleStructure extends Modifier {
  static type = 'ModifierToggleStructure';

  onDeactivate() {
    super.onDeactivate();
    const structureMod = this.getCard().getModifierByClass(ModifierPortal);
    // stop this structure from moving or attacking (default structure behavior)
    if (structureMod != null) {
      structureMod.stopMove();
      return structureMod.stopAttack();
    }
  }

  onActivate() {
    super.onActivate();
    const structureMod = this.getCard().getModifierByClass(ModifierPortal);
    // allow this structure to move and attack
    if (structureMod != null) {
      structureMod.allowMove();
      return structureMod.allowAttack();
    }
  }
}
ModifierToggleStructure.prototype.type = 'ModifierToggleStructure';
ModifierToggleStructure.description = i18next.t('modifiers.toggle_structure_def');
ModifierToggleStructure.prototype.fxResource = ['FX.Modifiers.ModifierToggleStructure'];

module.exports = ModifierToggleStructure;
