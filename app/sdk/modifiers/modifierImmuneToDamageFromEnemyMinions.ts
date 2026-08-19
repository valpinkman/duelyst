/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierImmuneToDamage = require('./modifierImmuneToDamage');

/*
  Modifier that reduces all damage dealt by generals to this unit to 0.
*/

class ModifierImmuneToDamageFromEnemyMinions extends ModifierImmuneToDamage {
  declare type: any;

  static type = 'ModifierImmuneToDamageFromEnemyMinions';
  static modifierName = 'Enemy Minion Immunity';
  static description = 'Takes no damage from enemy minions';

  getIsActionRelevant(a) {
    return (this.getCard() != null) && a instanceof DamageAction && a.getIsValid() && (this.getCard() === a.getTarget()) && !(__guard__(a.getSource(), (x) => x.getIsGeneral())) && (__guard__(a.getSource(), (x1) => x1.getOwnerId()) !== this.getCard().getOwnerId());
  }
}
ModifierImmuneToDamageFromEnemyMinions.prototype.type = 'ModifierImmuneToDamageFromEnemyMinions';

module.exports = ModifierImmuneToDamageFromEnemyMinions;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
