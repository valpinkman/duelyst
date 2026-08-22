/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const UtilsPosition = require('app/common/utils/utils_position');
const CardType = require('@duelyst/sdk/cards/cardType');
const i18next = require('i18next');
const ModifierImmune = require('./modifierImmune');

class ModifierImmuneToSpells extends ModifierImmune {
  declare type: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierImmuneToSpells';

  onValidateAction(event) {
    const a = event.action;

    if (
      this.getCard() != null &&
      a instanceof ApplyCardToBoardAction &&
      a.getIsValid() &&
      UtilsPosition.getPositionsAreEqual(this.getCard().getPosition(), a.getTargetPosition())
    ) {
      const card = a.getCard();
      if (
        card != null &&
        __guard__(card.getRootCard(), (x) => x.type) === CardType.Spell &&
        !card.getTargetsSpace() &&
        !card.getAppliesSameEffectToMultipleTargets()
      ) {
        return this.invalidateAction(a, this.getCard().getPosition(), '[Not] a valid target.');
      }
    }
  }
}
ModifierImmuneToSpells.prototype.type = 'ModifierImmuneToSpells';
ModifierImmuneToSpells.modifierName = i18next.t('modifiers.immune_to_spells_name');
ModifierImmuneToSpells.description = i18next.t('modifiers.immune_to_spells_def');
ModifierImmuneToSpells.prototype.fxResource = [
  'FX.Modifiers.ModifierImmunity',
  'FX.Modifiers.ModifierImmunitySpell',
];

module.exports = ModifierImmuneToSpells;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
