/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const i18next = require('i18next');
const ModifierImmuneToDamage = require('./modifierImmuneToDamage');

/*
  Modifier that reduces all damage dealt by minions or generals to this unit to 0.
*/

class ModifierImmuneToDamageFromMinionsAndGenerals extends ModifierImmuneToDamage {
  declare type: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierImmuneToDamageFromMinionsAndGenerals';

  getIsActionRelevant(a) {
    return (this.getCard() != null) && a instanceof DamageAction && a.getIsValid() && (this.getCard() === a.getTarget()) && (a.getSource().getRootCard().getType() === CardType.Unit);
  }
}
ModifierImmuneToDamageFromMinionsAndGenerals.prototype.type = 'ModifierImmuneToDamageFromMinionsAndGenerals';
ModifierImmuneToDamageFromMinionsAndGenerals.modifierName = i18next.t('modifiers.immune_to_damage_from_minions_and_generals_name');
ModifierImmuneToDamageFromMinionsAndGenerals.description = i18next.t('modifiers.immune_to_damage_from_minions_and_generals_def');

module.exports = ModifierImmuneToDamageFromMinionsAndGenerals;
