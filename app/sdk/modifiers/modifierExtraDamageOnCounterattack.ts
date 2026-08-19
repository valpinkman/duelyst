/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const EVENTS = require('app/common/event_types');
const ModifierStrikeback = require('./modifierStrikeback');
const Modifier = require('./modifier');

class ModifierExtraDamageOnCounterattack extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierExtraDamageOnCounterattack';
  static modifierName = 'Extra Damage on Counterattack';
  static description = 'Deals double damage on counter attacks';

  static createContextObject(extraDamage, options) {
    if (extraDamage == null) { extraDamage = 2; }
    const contextObject = super.createContextObject(options);
    contextObject.extraDamage = extraDamage;
    return contextObject;
  }

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  onModifyActionForEntitiesInvolvedInAttack(actionEvent) {
    const a = actionEvent.action;
    if (this.getIsActive() && this.getIsActionRelevant(a)) {
      return this._modifyAction(a);
    }
  }

  onModifyActionForExecution(actionEvent) {
    super.onModifyActionForExecution(actionEvent);
    const a = actionEvent.action;
    if (this.getIsActionRelevant(a)) {
      return this._modifyAction(a);
    }
  }

  getIsActionRelevant(a) {
    // check if this action will deal damage or take damage
    return a.getTriggeringModifier() instanceof ModifierStrikeback && (a.getSource() === this.getCard());
  }

  _modifyAction(a) {
    a.setChangedByModifier(this);
    return a.changeDamageMultiplierBy(this.extraDamage);
  }
}
ModifierExtraDamageOnCounterattack.prototype.type = 'ModifierExtraDamageOnCounterattack';
ModifierExtraDamageOnCounterattack.prototype.activeInHand = false;
ModifierExtraDamageOnCounterattack.prototype.activeInDeck = false;
ModifierExtraDamageOnCounterattack.prototype.activeInSignatureCards = false;
ModifierExtraDamageOnCounterattack.prototype.activeOnBoard = true;
ModifierExtraDamageOnCounterattack.prototype.fxResource = ['FX.Modifiers.ModifierDealDamageWatch'];

module.exports = ModifierExtraDamageOnCounterattack;
