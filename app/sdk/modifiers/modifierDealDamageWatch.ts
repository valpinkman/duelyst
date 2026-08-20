/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierDealDamageWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare enemyOnly: any;
  declare fxResource: any;

  static type = 'ModifierDealDamageWatch';
  static modifierName = 'Deal Damage Watch';
  static description = 'Each time this unit damages an enemy unit...';

  onAction(actionEvent) {
    super.onAction(actionEvent);
    const a = actionEvent.action;
    if (this.getIsActionRelevant(a)) {
      return this.onDealDamage(a);
    }
  }

  onAfterCleanupAction(actionEvent) {
    super.onAfterCleanupAction(actionEvent);
    const a = actionEvent.action;
    if (this.getIsActionRelevant(a)) {
      return this.onAfterDealDamage(a);
    }
  }

  getIsActionRelevant(a) {
    // check if this action will deal damage
    let isRelevant =
      a instanceof DamageAction && a.getSource() === this.getCard() && this.willDealDamage(a);
    if (this.enemyOnly) {
      // check that target of damage action is an enemy
      isRelevant = isRelevant && a.getTarget().getOwnerId() !== this.getCard().getOwnerId();
    }
    return isRelevant;
  }

  willDealDamage(action) {
    // total damage should be calculated during modify_action_for_execution phase
    return action.getTotalDamageAmount() > 0;
  }

  onDealDamage(action) {}
  // override me in sub classes to implement special behavior
  // use this for most on damage triggers

  onAfterDealDamage(action) {}
}
ModifierDealDamageWatch.prototype.type = 'ModifierDealDamageWatch';
ModifierDealDamageWatch.prototype.activeInHand = false;
ModifierDealDamageWatch.prototype.activeInDeck = false;
ModifierDealDamageWatch.prototype.activeInSignatureCards = false;
ModifierDealDamageWatch.prototype.activeOnBoard = true;
ModifierDealDamageWatch.prototype.enemyOnly = false;
ModifierDealDamageWatch.prototype.fxResource = ['FX.Modifiers.ModifierDealDamageWatch'];
// override me in sub classes to implement special behavior
// use this for on deal damage triggers that MUST happen last
// - careful! if the unit dies during this step, this method will not be called!

module.exports = ModifierDealDamageWatch;
