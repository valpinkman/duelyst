/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const i18next = require('i18next');
const ModifierImmuneToDamage = require('./modifierImmuneToDamage');

/*
  Modifier that reduces all damage dealt by generals to this unit to 0.
*/

class ModifierImmuneToDamageByGeneral extends ModifierImmuneToDamage {
  declare type: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierImmuneToDamageByGeneral';

  getIsActionRelevant(a) {
    return (
      this.getCard() != null &&
      a instanceof AttackAction &&
      a.getIsValid() &&
      this.getCard() === a.getTarget() &&
      __guard__(a.getSource(), (x) => x.getIsGeneral())
    );
  }
}
ModifierImmuneToDamageByGeneral.prototype.type = 'ModifierImmuneToDamageByGeneral';
ModifierImmuneToDamageByGeneral.modifierName = i18next.t(
  'modifiers.immune_to_damage_by_general_name',
);
ModifierImmuneToDamageByGeneral.description = i18next.t(
  'modifiers.immune_to_damage_by_general_def',
);

module.exports = ModifierImmuneToDamageByGeneral;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
