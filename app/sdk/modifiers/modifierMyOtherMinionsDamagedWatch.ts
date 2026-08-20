/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const Modifier = require('./modifier');

class ModifierMyOtherMinionsDamagedWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyOtherMinionsDamagedWatch';

  onAfterCleanupAction(actionEvent) {
    super.onAfterCleanupAction(actionEvent);

    const { action } = actionEvent;
    // check if action is a damage action targeting a friendly minion
    if (
      action instanceof DamageAction &&
      __guard__(action.getTarget(), (x) => x.getOwnerId()) === this.getCard().getOwnerId() &&
      action.getTarget() !== this.getCard() &&
      !action.getTarget().getIsGeneral()
    ) {
      if (this.willDealDamage(action)) {
        // check if anything is preventing this action from dealing its damage
        return this.onDamageDealtToMinion(action);
      }
    }
  }

  willDealDamage(action) {
    // total damage should be calculated during modify_action_for_execution phase
    return action.getTotalDamageAmount() > 0;
  }

  onDamageDealtToMinion(action) {}
}
ModifierMyOtherMinionsDamagedWatch.prototype.type = 'ModifierMyOtherMinionsDamagedWatch';
ModifierMyOtherMinionsDamagedWatch.prototype.activeInHand = false;
ModifierMyOtherMinionsDamagedWatch.prototype.activeInDeck = false;
ModifierMyOtherMinionsDamagedWatch.prototype.activeInSignatureCards = false;
ModifierMyOtherMinionsDamagedWatch.prototype.activeOnBoard = true;
ModifierMyOtherMinionsDamagedWatch.prototype.fxResource = [
  'FX.Modifiers.ModifierMyOtherMinionsDamagedWatch',
];
// override me in sub classes to implement special behavior

module.exports = ModifierMyOtherMinionsDamagedWatch;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
