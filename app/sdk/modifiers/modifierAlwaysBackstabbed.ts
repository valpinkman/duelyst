/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('app/sdk/actions/attackAction');
const Modifier = require('./modifier');
const ModifierBackstab = require('./modifierBackstab');

class ModifierAlwaysBackstabbed extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierAlwaysBackstabbed';
  static isHiddenToUI = false;

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    return a instanceof AttackAction && (a.getTarget() === this.getCard());
  }

  _modifyAction(a) {
    a.setChangedByModifier(this);
    return a.setIsStrikebackAllowed(false); // backstab attacker does not suffer strikeback
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
ModifierAlwaysBackstabbed.prototype.type = 'ModifierAlwaysBackstabbed';
ModifierAlwaysBackstabbed.prototype.activeInHand = false;
ModifierAlwaysBackstabbed.prototype.activeInDeck = false;
ModifierAlwaysBackstabbed.prototype.activeInSignatureCards = false;
ModifierAlwaysBackstabbed.prototype.activeOnBoard = true;
ModifierAlwaysBackstabbed.prototype.fxResource = ['FX.Modifiers.ModifierAlwaysBackstabbed'];

module.exports = ModifierAlwaysBackstabbed;
