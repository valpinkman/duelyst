/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierCannot = require('./modifierCannot');

class ModifierCannotDamageGenerals extends ModifierCannot {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;

  static type = 'ModifierCannotDamageGenerals';

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    return a instanceof DamageAction && a.getTarget().getIsGeneral() && (a.getSource() === this.getCard());
  }

  _modifyAction(a) {
    a.setChangedByModifier(this);
    return a.setDamageMultiplier(0);
  }

  onModifyActionForExecution(actionEvent) {
    super.onModifyActionForExecution(actionEvent);

    const a = actionEvent.action;
    if (this.getIsActionRelevant(a)) {
      return this._modifyAction(a);
    }
  }

  onModifyActionForEntitiesInvolvedInAttack(actionEvent) {
    const a = actionEvent.action;
    if (this.getIsActive() && this.getIsActionRelevant(a)) {
      return this._modifyAction(a);
    }
  }
}
ModifierCannotDamageGenerals.prototype.type = 'ModifierCannotDamageGenerals';
ModifierCannotDamageGenerals.prototype.activeInHand = false;
ModifierCannotDamageGenerals.prototype.activeInDeck = false;
ModifierCannotDamageGenerals.prototype.activeInSignatureCards = false;
ModifierCannotDamageGenerals.prototype.activeOnBoard = true;

module.exports = ModifierCannotDamageGenerals;
