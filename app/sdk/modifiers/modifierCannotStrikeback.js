/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('app/sdk/actions/attackAction');
const i18next = require('i18next');
const ModifierCannot = require('./modifierCannot');

class ModifierCannotStrikeback extends ModifierCannot {
  static type = 'ModifierCannotStrikeback';

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
    return a.setIsStrikebackAllowed(false);
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
ModifierCannotStrikeback.prototype.type = 'ModifierCannotStrikeback';
ModifierCannotStrikeback.modifierName = i18next.t('modifiers.cannot_strikeback_name');
ModifierCannotStrikeback.description = i18next.t('modifiers.cannot_strikeback_def');

module.exports = ModifierCannotStrikeback;
