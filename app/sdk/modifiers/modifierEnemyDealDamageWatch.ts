/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const Modifier = require('./modifier');

class ModifierEnemyDealDamageWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierEnemyDealDamageWatch';
  static modifierName = 'Enemy Deal Damage Watch';
  static description = 'Whenever an enemy deals damage...';

  onAction(actionEvent) {
    super.onAction(actionEvent);

    const a = actionEvent.action;
    if (
      a instanceof DamageAction &&
      __guard__(a.getTarget(), (x) => x.getOwnerId()) === this.getCard().getOwnerId()
    ) {
      if (this.willDealDamage(a)) {
        // check if anything is preventing this action from dealing its damage
        return this.onEnemyDamageDealt(a);
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

  onEnemyDamageDealt(action) {}
}
ModifierEnemyDealDamageWatch.prototype.type = 'ModifierEnemyDealDamageWatch';
ModifierEnemyDealDamageWatch.prototype.activeInHand = false;
ModifierEnemyDealDamageWatch.prototype.activeInDeck = false;
ModifierEnemyDealDamageWatch.prototype.activeInSignatureCards = false;
ModifierEnemyDealDamageWatch.prototype.activeOnBoard = true;
// override me in sub classes to implement special behavior

module.exports = ModifierEnemyDealDamageWatch;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
