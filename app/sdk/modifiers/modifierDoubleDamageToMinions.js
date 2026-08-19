/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('app/sdk/actions/attackAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierDoubleDamageToMinions extends Modifier {
  static type = 'ModifierDoubleDamageToMinions';
  static modifierName = 'Double Damage To Minions';
  static description = 'Deals double damage to minions';

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    return a instanceof AttackAction && (a.getSource() === this.getCard()) && !__guard__(a.getTarget(), (x) => x.getIsGeneral());
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
ModifierDoubleDamageToMinions.prototype.type = 'ModifierDoubleDamageToMinions';
ModifierDoubleDamageToMinions.prototype.activeInHand = false;
ModifierDoubleDamageToMinions.prototype.activeInDeck = false;
ModifierDoubleDamageToMinions.prototype.activeInSignatureCards = false;
ModifierDoubleDamageToMinions.prototype.activeOnBoard = true;
ModifierDoubleDamageToMinions.prototype.damageBonus = 2;
ModifierDoubleDamageToMinions.prototype.fxResource = ['FX.Modifiers.ModifierDoubleDamageToMinions'];

module.exports = ModifierDoubleDamageToMinions;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
