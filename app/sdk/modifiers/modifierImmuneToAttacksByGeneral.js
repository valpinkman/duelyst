/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const AttackAction = require('app/sdk/actions/attackAction');
const ModifierImmuneToAttacks = require('./modifierImmuneToAttacks');

/*
  Modifier that invalidates attacks against this unit from generals.
*/

class ModifierImmuneToAttacksByGeneral extends ModifierImmuneToAttacks {
  static type = 'ModifierImmuneToAttacksByGeneral';
  static modifierName = 'General Immunity';
  static description = 'Cannot be attacked by Generals';

  getIsActionRelevant(a) {
    return (this.getCard() != null) && a instanceof AttackAction && a.getIsValid() && !a.getIsImplicit() && (this.getCard() === a.getTarget()) && __guard__(a.getSource(), (x) => x.getIsGeneral());
  }
}
ModifierImmuneToAttacksByGeneral.prototype.type = 'ModifierImmuneToAttacksByGeneral';

module.exports = ModifierImmuneToAttacksByGeneral;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
