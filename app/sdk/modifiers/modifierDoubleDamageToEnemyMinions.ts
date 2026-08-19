/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');

class ModifierDoubleDamageToEnemyMinions extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare damageBonus: any;
  declare fxResource: any;

  static type = 'ModifierDoubleDamageToEnemyMinions';
  static modifierName = 'Double Damage To Enemy Minions';
  static description = 'Deals double damage to enemy minions';

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    return a instanceof DamageAction && (a.getSource() === this.getCard()) && !__guard__(a.getTarget(), (x) => x.getIsGeneral()) && (__guard__(a.getTarget(), (x1) => x1.getOwnerId()) !== this.getCard().getOwnerId());
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
ModifierDoubleDamageToEnemyMinions.prototype.type = 'ModifierDoubleDamageToEnemyMinions';
ModifierDoubleDamageToEnemyMinions.prototype.activeInHand = false;
ModifierDoubleDamageToEnemyMinions.prototype.activeInDeck = false;
ModifierDoubleDamageToEnemyMinions.prototype.activeInSignatureCards = false;
ModifierDoubleDamageToEnemyMinions.prototype.activeOnBoard = true;
ModifierDoubleDamageToEnemyMinions.prototype.damageBonus = 2;
ModifierDoubleDamageToEnemyMinions.prototype.fxResource = ['FX.Modifiers.ModifierDoubleDamageToEnemyMinions'];

module.exports = ModifierDoubleDamageToEnemyMinions;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
