/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierTakeDamageWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierTakeDamageWatch';
  static modifierName = 'Take Damage Watch';
  static description = 'Whenever this minion takes damage...';

  onAction(actionEvent) {
    super.onAction(actionEvent);

    const a = actionEvent.action;
    if (a instanceof DamageAction && a.getTarget() === this.getCard()) {
      if (this.willDealDamage(a)) {
        // check if anything is preventing this action from dealing its damage
        return this.onDamageTaken(a);
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

  onDamageTaken(action) {}
}
ModifierTakeDamageWatch.prototype.type = 'ModifierTakeDamageWatch';
ModifierTakeDamageWatch.prototype.activeInHand = false;
ModifierTakeDamageWatch.prototype.activeInDeck = false;
ModifierTakeDamageWatch.prototype.activeInSignatureCards = false;
ModifierTakeDamageWatch.prototype.activeOnBoard = true;
ModifierTakeDamageWatch.prototype.fxResource = ['FX.Modifiers.ModifierTakeDamageWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierTakeDamageWatch;
