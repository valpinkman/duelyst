/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const ModifierImmuneToAttacks = require('./modifierImmuneToAttacks');

/*
  Modifier that invalidates attacks against this unit from sources that are ranged.
*/

class ModifierImmuneToAttacksByRanged extends ModifierImmuneToAttacks {
  static type = 'ModifierImmuneToAttacksByRanged';
  static modifierName = 'Ranged Immunity';
  static description = 'Cannot be attacked by ranged minions';

  getIsActionRelevant(a) {
    return (this.getCard() != null) && a instanceof AttackAction && a.getIsValid() && (this.getCard() === a.getTarget()) && __guard__(a.getSource(), (x) => x.isRanged());
  }
}
ModifierImmuneToAttacksByRanged.prototype.type = 'ModifierImmuneToAttacksByRanged';

module.exports = ModifierImmuneToAttacksByRanged;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
