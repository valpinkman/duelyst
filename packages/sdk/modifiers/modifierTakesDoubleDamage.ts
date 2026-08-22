/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierTakesDoubleDamage extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare damageBonus: any;
  declare fxResource: any;

  static type = 'ModifierTakesDoubleDamage';
  static modifierName = 'Takes double damage';
  static description = 'Whenever this takes damage, it takes double';

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    return a instanceof DamageAction && a.getTarget() === this.getCard();
  }

  _modifyAction(a) {
    a.setChangedByModifier(this);
    return a.changeDamageMultiplierBy(this.damageBonus);
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
ModifierTakesDoubleDamage.prototype.type = 'ModifierTakesDoubleDamage';
ModifierTakesDoubleDamage.prototype.activeInHand = false;
ModifierTakesDoubleDamage.prototype.activeInDeck = false;
ModifierTakesDoubleDamage.prototype.activeInSignatureCards = false;
ModifierTakesDoubleDamage.prototype.activeOnBoard = true;
ModifierTakesDoubleDamage.prototype.damageBonus = 2;
ModifierTakesDoubleDamage.prototype.fxResource = [
  'FX.Modifiers.ModifierDoubleDamageToEnemyMinions',
];

module.exports = ModifierTakesDoubleDamage;
