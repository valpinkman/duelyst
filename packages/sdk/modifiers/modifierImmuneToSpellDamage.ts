/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const CardType = require('@duelyst/sdk/cards/cardType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const i18next = require('i18next');
const ModifierImmuneToDamage = require('./modifierImmuneToDamage');

class ModifierImmuneToSpellDamage extends ModifierImmuneToDamage {
  declare type: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierImmuneToSpellDamage';

  getIsActionRelevant(a) {
    if (
      this.getCard() != null &&
      a instanceof DamageAction &&
      this.getCard() === a.getTarget() &&
      !a.getCreatedByTriggeringModifier() &&
      __guard__(a.getSource(), (x) => x.getType()) === CardType.Spell
    ) {
      const rootAction = a.getRootAction();
      // this action was not triggered by a modifier, but was it caused by a spell cast?
      if (
        rootAction instanceof ApplyCardToBoardAction &&
        __guard__(rootAction.getCard().getRootCard(), (x1) => x1.getType()) === CardType.Spell
      ) {
        return true;
      }
    }
    return false;
  }
}
ModifierImmuneToSpellDamage.prototype.type = 'ModifierImmuneToSpellDamage';
ModifierImmuneToSpellDamage.modifierName = i18next.t('modifiers.immune_to_spell_damage_name');
ModifierImmuneToSpellDamage.description = i18next.t('modifiers.immune_to_spell_damage_def');
ModifierImmuneToSpellDamage.prototype.fxResource = [
  'FX.Modifiers.ModifierImmunity',
  'FX.Modifiers.ModifierImmunitySpell',
];

module.exports = ModifierImmuneToSpellDamage;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
