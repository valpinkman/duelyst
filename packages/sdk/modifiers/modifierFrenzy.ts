/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const ForcedAttackAction = require('@duelyst/sdk/actions/forcedAttackAction');
const CardType = require('@duelyst/sdk/cards/cardType');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierFrenzy extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierFrenzy';
  static isKeyworded = true;
  static description = null;

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.entities_involved_in_attack) {
        return this.onEntitiesInvolvedInAttack(event);
      }
    }
  }

  getIsActionRelevant(a) {
    // frenzy when we notice our entity is attacking, but only on an explict attack (i.e. not on a strikeback)
    if (
      a.getSource() === this.getCard() &&
      ((a instanceof AttackAction && !a.getIsImplicit()) || a instanceof ForcedAttackAction)
    ) {
      // check if attack is in melee range
      const target = a.getTarget();
      const targetPosition = target.getPosition();
      const entityPosition = this.getCard().getPosition();
      return (
        Math.abs(targetPosition.x - entityPosition.x) <= 1 &&
        Math.abs(targetPosition.y - entityPosition.y) <= 1
      );
    }
    return false;
  }

  getAttackableEntities(a) {
    const entities = [];
    const target = a.getTarget();

    // find all other attackable enemy entities
    for (var entity of Array.from<any>(
      this.getGameSession()
        .getBoard()
        .getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1),
    )) {
      if (entity !== target) {
        entities.push(entity);
      }
    }

    return entities;
  }

  onBeforeAction(event) {
    super.onBeforeAction(event);

    const a = event.action;
    if (this.getIsActionRelevant(a)) {
      return (() => {
        const result = [];
        for (var entity of Array.from<any>(this.getAttackableEntities(a))) {
          var attackAction = this.getCard().actionAttack(entity);
          result.push(this.getGameSession().executeAction(attackAction));
        }
        return result;
      })();
    }
  }

  onEntitiesInvolvedInAttack(actionEvent) {
    const a = actionEvent.action;
    if (this.getIsActive() && this.getIsActionRelevant(a)) {
      return (() => {
        const result = [];
        for (var entity of Array.from<any>(this.getAttackableEntities(a))) {
          var attackAction = this.getCard().actionAttack(entity);
          attackAction.setTriggeringModifier(this);
          result.push(actionEvent.actions.push(attackAction));
        }
        return result;
      })();
    }
  }
}
ModifierFrenzy.prototype.type = 'ModifierFrenzy';
ModifierFrenzy.keywordDefinition = i18next.t('modifiers.frenzy_def');
ModifierFrenzy.prototype.maxStacks = 1;
ModifierFrenzy.modifierName = i18next.t('modifiers.frenzy_name');
ModifierFrenzy.prototype.activeInHand = false;
ModifierFrenzy.prototype.activeInDeck = false;
ModifierFrenzy.prototype.activeInSignatureCards = false;
ModifierFrenzy.prototype.activeOnBoard = true;
ModifierFrenzy.prototype.fxResource = ['FX.Modifiers.ModifierFrenzy'];

module.exports = ModifierFrenzy;
