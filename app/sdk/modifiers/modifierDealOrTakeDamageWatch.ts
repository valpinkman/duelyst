/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierDealOrTakeDamageWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare enemyOnly: any;
  declare fxResource: any;

  static type = 'ModifierDealOrTakeDamageWatch';
  static modifierName = 'Deal Or Take Damage Watch';
  static description = 'Each time this unit takes damage or damages an enemy unit...';

  onAction(actionEvent) {
    super.onAction(actionEvent);
    const a = actionEvent.action;
    if (this.getIsActionRelevant(a)) {
      return this.onDealOrTakeDamage(a);
    }
  }

  getIsActionRelevant(a) {
    // check if this action will deal damage or take damage
    return (
      a instanceof DamageAction &&
      (a.getSource() === this.getCard() || a.getTarget() === this.getCard()) &&
      this.willDealDamage(a)
    );
  }

  willDealDamage(action) {
    // total damage should be calculated during modify_action_for_execution phase
    return action.getTotalDamageAmount() > 0;
  }

  onDealOrTakeDamage(action) {}
}
ModifierDealOrTakeDamageWatch.prototype.type = 'ModifierDealOrTakeDamageWatch';
ModifierDealOrTakeDamageWatch.prototype.activeInHand = false;
ModifierDealOrTakeDamageWatch.prototype.activeInDeck = false;
ModifierDealOrTakeDamageWatch.prototype.activeInSignatureCards = false;
ModifierDealOrTakeDamageWatch.prototype.activeOnBoard = true;
ModifierDealOrTakeDamageWatch.prototype.enemyOnly = false;
ModifierDealOrTakeDamageWatch.prototype.fxResource = ['FX.Modifiers.ModifierDealDamageWatch'];
// override me in sub classes to implement special behavior
// use this for most on damage triggers

module.exports = ModifierDealOrTakeDamageWatch;
