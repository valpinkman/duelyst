/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const Modifier = require('./modifier');

class ModifierMyGeneralDamagedWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyGeneralDamagedWatch';
  static modifierName = 'My General Damaged Watch';
  static description = 'My General Damaged Watch';

  onAfterCleanupAction(actionEvent) {
    super.onAfterCleanupAction(actionEvent);

    const {
      action,
    } = actionEvent;
    // check if action is a damage action targeting my General
    if (action instanceof DamageAction) {
      const target = action.getTarget();
      if ((target != null) && target.getIsSameTeamAs(this.getCard()) && target.getWasGeneral() && this.willDealDamage(action)) {
        return this.onDamageDealtToGeneral(action);
      }
    }
  }

  willDealDamage(action) {
    // total damage should be calculated during modify_action_for_execution phase
    return action.getTotalDamageAmount() > 0;
  }

  onDamageDealtToGeneral(action) {}
}
ModifierMyGeneralDamagedWatch.prototype.type = 'ModifierMyGeneralDamagedWatch';
ModifierMyGeneralDamagedWatch.prototype.activeInHand = false;
ModifierMyGeneralDamagedWatch.prototype.activeInDeck = false;
ModifierMyGeneralDamagedWatch.prototype.activeInSignatureCards = false;
ModifierMyGeneralDamagedWatch.prototype.activeOnBoard = true;
ModifierMyGeneralDamagedWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyGeneralDamagedWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyGeneralDamagedWatch;
