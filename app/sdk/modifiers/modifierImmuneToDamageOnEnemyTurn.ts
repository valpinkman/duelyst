/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierImmuneToDamage = require('./modifierImmuneToDamage');

/*
  Modifier that reduces all damage dealt on enemy's turn to this unit to 0.
*/

class ModifierImmuneToDamageOnEnemyTurn extends ModifierImmuneToDamage {
  declare type: any;

  static type = 'ModifierImmModifierImmuneToDamageOnEnemyTurnuneToDamageByGeneral';
  static modifierName = 'Enemy Turn Immunity';
  static description = 'Takes no damage on enemy\'s turn';

  getIsActionRelevant(a) {
    return (this.getCard() != null) && (this.getGameSession().getCurrentTurn().getPlayerId() !== this.getCard().getOwnerId()) && a instanceof DamageAction && a.getIsValid() && (this.getCard() === a.getTarget());
  }
}
ModifierImmuneToDamageOnEnemyTurn.prototype.type = 'ModifierImmuneToDamageOnEnemyTurn';

module.exports = ModifierImmuneToDamageOnEnemyTurn;
