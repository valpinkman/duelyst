/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierAbsorbDamage extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare canAbsorb: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierAbsorbDamage';

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  static createContextObject(absorbAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAbsorbAmount = absorbAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.absorb_damage_def', { amount: this.damageAbsorbAmount });
    }
    return this.description;
  }

  onStartTurn(actionEvent) {
    super.onStartTurn(actionEvent);
    return (this.canAbsorb = true);
  }

  getIsActionRelevant(a) {
    return this.canAbsorb && a instanceof DamageAction && a.getTarget() === this.getCard();
  }

  _modifyAction(a) {
    a.setChangedByModifier(this);
    return a.changeFinalDamageBy(-this.damageAbsorbAmount);
  }

  onModifyActionForExecution(actionEvent) {
    super.onModifyActionForExecution(actionEvent);

    const a = actionEvent.action;
    if (this.getIsActionRelevant(a)) {
      this._modifyAction(a);
      return (this.canAbsorb = false);
    }
  }

  onModifyActionForEntitiesInvolvedInAttack(actionEvent) {
    const a = actionEvent.action;
    if (this.getIsActive() && this.getIsActionRelevant(a)) {
      return this._modifyAction(a);
    }
  }
}
ModifierAbsorbDamage.prototype.type = 'ModifierAbsorbDamage';
ModifierAbsorbDamage.modifierName = i18next.t('modifiers.absorb_damage_name');
ModifierAbsorbDamage.description = i18next.t('modifiers.absorb_damage_def');
ModifierAbsorbDamage.prototype.activeInHand = false;
ModifierAbsorbDamage.prototype.activeInDeck = false;
ModifierAbsorbDamage.prototype.activeInSignatureCards = false;
ModifierAbsorbDamage.prototype.activeOnBoard = true;
ModifierAbsorbDamage.prototype.canAbsorb = true;
ModifierAbsorbDamage.prototype.fxResource = ['FX.Modifiers.ModifierAbsorbDamage'];

module.exports = ModifierAbsorbDamage;
