/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const CONFIG = require('app/common/config');
const AttackAction = require('app/sdk/actions/attackAction');
const ForcedAttackAction = require('app/sdk/actions/forcedAttackAction');
const Modifier = require('./modifier');
const ModifierBlastAttack = require('./modifierBlastAttack');

class ModifierStrikeback extends Modifier {
  static type = 'ModifierStrikeback';
  static modifierName = 'Strikeback';
  static description = null;
  static isHiddenToUI = true;

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.entities_involved_in_attack) {
        return this.onEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    // attack against this entity must be explicit or caused by a specific modifier that entities are allowed to strikeback against
    return ((a instanceof AttackAction && (!a.getIsImplicit() || a.getTriggeringModifier() instanceof ModifierBlastAttack)) || a instanceof ForcedAttackAction) && (a.getTarget() === this.getCard()) && (a.getSource() !== this.getCard()) && a.getIsStrikebackAllowed() && (this.getCard().getATK() > 0) && this.getCanReachEntity(a.getSource());
  }

  onBeforeAction(actionEvent) {
    const a = actionEvent.action;
    if (this.getIsActionRelevant(a)) {
      const attackAction = this.getCard().actionAttack(a.getSource());
      return this.getCard().getGameSession().executeAction(attackAction);
    }
  }

  onEntitiesInvolvedInAttack(actionEvent) {
    const a = actionEvent.action;
    if (this.getIsActive() && this.getIsActionRelevant(a)) {
      const attackAction = this.getCard().actionAttack(a.getSource());
      attackAction.setTriggeringModifier(this);
      return actionEvent.actions.push(attackAction);
    }
  }

  getCanReachEntity(entity) {
    // check that entity is within my range
    const reach = this.getCard().getReach();
    if (reach === 1) {
      for (var nearbyEntity of Array.from(this.getCard().getGameSession().getBoard().getEntitiesAroundEntity(this.getCard()))) {
        if (nearbyEntity === entity) {
          return true;
        }
      }
    } else if (reach > 1) {
      return true;
    }

    return false;
  }
}
ModifierStrikeback.prototype.type = 'ModifierStrikeback';
ModifierStrikeback.prototype.isRemovable = false;
ModifierStrikeback.prototype.isCloneable = false;
ModifierStrikeback.prototype.activeInHand = false;
ModifierStrikeback.prototype.activeInDeck = false;
ModifierStrikeback.prototype.activeInSignatureCards = false;
ModifierStrikeback.prototype.activeOnBoard = true;
ModifierStrikeback.prototype.maxStacks = 1;
ModifierStrikeback.prototype.fxResource = ['FX.Modifiers.ModifierStrikeback'];

module.exports = ModifierStrikeback;
