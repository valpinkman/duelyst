/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierAttacksDealNoDamage extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierAttacksDealNoDamage';

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    return a instanceof AttackAction && a.getSource() === this.getCard();
  }

  _modifyAction(a) {
    a.setChangedByModifier(this);
    return a.changeDamageMultiplierBy(0);
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
ModifierAttacksDealNoDamage.prototype.type = 'ModifierAttacksDealNoDamage';
ModifierAttacksDealNoDamage.prototype.maxStacks = 1;
ModifierAttacksDealNoDamage.modifierName = i18next.t('modifiers.attacks_deal_no_damage_name');
ModifierAttacksDealNoDamage.description = i18next.t('modifiers.attack_equals_health_def');
ModifierAttacksDealNoDamage.prototype.activeInHand = false;
ModifierAttacksDealNoDamage.prototype.activeInDeck = false;
ModifierAttacksDealNoDamage.prototype.activeOnBoard = true;
ModifierAttacksDealNoDamage.prototype.fxResource = ['FX.Modifiers.ModifierAttacksDealNoDamage'];

module.exports = ModifierAttacksDealNoDamage;
