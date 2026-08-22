/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const ModifierStunned = require('@duelyst/sdk/modifiers/modifierStunned');
const KillAction = require('@duelyst/sdk/actions/killAction');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierShatteringHeart extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierShatteringHeart';

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        this.onModifyActionForEntitiesInvolvedInAttack(event);
      }

      if (event.type === EVENTS.entities_involved_in_attack) {
        return this.onEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    return (
      a instanceof AttackAction &&
      !__guard__(a.getTarget(), (x) => x.getIsGeneral()) &&
      a.getSource() === this.getCard() &&
      __guard__(a.getTarget(), (x1) => x1.hasModifierClass(ModifierStunned))
    );
  }

  _modifyAction(a) {
    return a.setIsStrikebackAllowed(false);
  }

  onAction(actionEvent) {
    super.onAction(actionEvent);
    const a = actionEvent.action;
    if (this.getIsActionRelevant(a)) {
      const target = a.getTarget();
      const killAction = new KillAction(this.getGameSession());
      killAction.setOwnerId(this.getCard().getOwnerId());
      killAction.setSource(this.getCard());
      killAction.setTarget(target);
      return this.getGameSession().executeAction(killAction);
    }
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

  onEntitiesInvolvedInAttack(actionEvent) {
    const a = actionEvent.action;
    if (this.getIsActive() && this.getIsActionRelevant(a)) {
      const target = a.getTarget();
      const killAction = new KillAction(this.getGameSession());
      killAction.setOwnerId(this.getCard().getOwnerId());
      killAction.setSource(this.getCard());
      killAction.setTarget(target);
      return actionEvent.actions.push(killAction);
    }
  }
}
ModifierShatteringHeart.prototype.type = 'ModifierShatteringHeart';
ModifierShatteringHeart.modifierName = i18next.t('modifiers.shattering_heart_name');
ModifierShatteringHeart.description = i18next.t('modifiers.shattering_heart_def');
ModifierShatteringHeart.prototype.activeInHand = false;
ModifierShatteringHeart.prototype.activeInDeck = false;
ModifierShatteringHeart.prototype.activeInSignatureCards = false;
ModifierShatteringHeart.prototype.activeOnBoard = true;
ModifierShatteringHeart.prototype.maxStacks = 1;

module.exports = ModifierShatteringHeart;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
