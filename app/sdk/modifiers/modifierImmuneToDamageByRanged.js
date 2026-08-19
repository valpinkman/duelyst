/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const ModifierImmuneToDamage = require('./modifierImmuneToDamage');

/*
  Modifier that reduces all damage dealt by ranged to this unit to 0.
*/

class ModifierImmuneToDamageByRanged extends ModifierImmuneToDamage {
  static type = 'ModifierImmuneToDamageByRanged';
  static modifierName = 'Ranged Immunity';
  static description = 'Takes no damage from Ranged minions and Generals';

  getIsActionRelevant(a) {
    return (this.getCard() != null) && a instanceof AttackAction && a.getIsValid() && (this.getCard() === a.getTarget()) && __guard__(a.getSource(), (x) => x.isRanged());
  }
}
ModifierImmuneToDamageByRanged.prototype.type = 'ModifierImmuneToDamageByRanged';

module.exports = ModifierImmuneToDamageByRanged;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
