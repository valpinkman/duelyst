/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const Modifier = require('./modifier');

class ModifierMyMinionOrGeneralDamagedWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyMinionOrGeneralDamagedWatch';
  static modifierName = 'My General Damaged Watch';
  static description = 'My General Damaged Watch';

  onAfterCleanupAction(actionEvent) {
    super.onAfterCleanupAction(actionEvent);

    const {
      action,
    } = actionEvent;
    // check if action is a damage action targeting my General
    if (action instanceof DamageAction && (__guard__(action.getTarget(), (x) => x.getOwnerId()) === this.getCard().getOwnerId())) {
      if (this.willDealDamage(action)) { // check if anything is preventing this action from dealing its damage
        return this.onDamageDealtToMinionOrGeneral(action);
      }
    }
  }

  willDealDamage(action) {
    // total damage should be calculated during modify_action_for_execution phase
    return action.getTotalDamageAmount() > 0;
  }

  onDamageDealtToMinionOrGeneral(action) {}
}
ModifierMyMinionOrGeneralDamagedWatch.prototype.type = 'ModifierMyMinionOrGeneralDamagedWatch';
ModifierMyMinionOrGeneralDamagedWatch.prototype.activeInHand = false;
ModifierMyMinionOrGeneralDamagedWatch.prototype.activeInDeck = false;
ModifierMyMinionOrGeneralDamagedWatch.prototype.activeInSignatureCards = false;
ModifierMyMinionOrGeneralDamagedWatch.prototype.activeOnBoard = true;
ModifierMyMinionOrGeneralDamagedWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyMinionOrGeneralDamagedWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyMinionOrGeneralDamagedWatch;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
