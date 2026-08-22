/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const ModifierImmuneToAttacks = require('./modifierImmuneToAttacks');

/*
  Modifier that invalidates attacks against this unit from minions.
*/

class ModifierImmuneToAttacksByMinions extends ModifierImmuneToAttacks {
  declare type: any;

  static type = 'ModifierImmuneToAttacksByMinions';
  static modifierName = 'Minion Immunity';
  static description = 'Cannot be attacked by Minions';

  getIsActionRelevant(a) {
    return (
      this.getCard() != null &&
      a instanceof AttackAction &&
      a.getIsValid() &&
      !a.getIsImplicit() &&
      this.getCard() === a.getTarget() &&
      !__guard__(a.getSource(), (x) => x.getIsGeneral())
    );
  }
}
ModifierImmuneToAttacksByMinions.prototype.type = 'ModifierImmuneToAttacksByMinions';

module.exports = ModifierImmuneToAttacksByMinions;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
