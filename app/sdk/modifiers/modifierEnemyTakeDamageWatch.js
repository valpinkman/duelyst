/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierEnemyTakeDamageWatch extends Modifier {
  static type = 'ModifierEnemyTakeDamageWatch';
  static modifierName = 'Enemy Take Damage Watch';
  static description = 'Whenever this minion takes damage...';

  onAction(actionEvent) {
    super.onAction(actionEvent);

    const a = actionEvent.action;
    if (a instanceof DamageAction && (__guard__(a.getTarget(), (x) => x.getOwnerId()) !== this.getCard().getOwnerId())) {
      if (this.willDealDamage(a)) { // check if anything is preventing this action from dealing its damage
        return this.onEnemyDamageTaken(a);
      }
    }
  }

  willDealDamage(action) {
    // total damage should be calculated during modify_action_for_execution phase
    if (action.getTotalDamageAmount() > 0) {
      return true;
    }

    return false;
  }

  onEnemyDamageTaken(action) {}
}
ModifierEnemyTakeDamageWatch.prototype.type = 'ModifierEnemyTakeDamageWatch';
ModifierEnemyTakeDamageWatch.prototype.activeInHand = false;
ModifierEnemyTakeDamageWatch.prototype.activeInDeck = false;
ModifierEnemyTakeDamageWatch.prototype.activeInSignatureCards = false;
ModifierEnemyTakeDamageWatch.prototype.activeOnBoard = true;
ModifierEnemyTakeDamageWatch.prototype.fxResource = ['FX.Modifiers.ModifierEnemyTakeDamageWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEnemyTakeDamageWatch;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
