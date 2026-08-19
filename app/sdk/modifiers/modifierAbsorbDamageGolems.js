/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierAbsorbDamageGolems extends Modifier {
  static type = 'ModifierAbsorbDamageGolems';

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    return a instanceof DamageAction && (a.getTarget() === this.getCard());
  }

  _modifyAction(a) {
    a.setChangedByModifier(this);
    return a.changeFinalDamageBy(-1);
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
ModifierAbsorbDamageGolems.prototype.type = 'ModifierAbsorbDamageGolems';
ModifierAbsorbDamageGolems.modifierName = i18next.t('modifiers.absorb_damage_golems_name');
ModifierAbsorbDamageGolems.description = i18next.t('modifiers.absorb_damage_golems_def');
ModifierAbsorbDamageGolems.prototype.activeInHand = false;
ModifierAbsorbDamageGolems.prototype.activeInDeck = false;
ModifierAbsorbDamageGolems.prototype.activeInSignatureCards = false;
ModifierAbsorbDamageGolems.prototype.activeOnBoard = true;
ModifierAbsorbDamageGolems.prototype.canAbsorb = true;
ModifierAbsorbDamageGolems.prototype.fxResource = ['FX.Modifiers.ModifierAbsorbDamageGolems'];

module.exports = ModifierAbsorbDamageGolems;
