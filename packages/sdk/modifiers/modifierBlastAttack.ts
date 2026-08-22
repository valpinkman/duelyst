/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const CONFIG = require('app/common/config');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const _ = require('underscore');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierBlastAttack extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare maxStacks: any;
  declare fxResource: any;
  declare cardFXResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierBlastAttack';
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

  onActivate() {
    super.onActivate();

    // override the attack pattern with blast
    return this.getCard().setCustomAttackPattern(CONFIG.PATTERN_BLAST);
  }

  onDeactivate() {
    super.onDeactivate();

    this.getCard().setCustomAttackPattern(null); // entity can no longer attack whole row if blast is dispelled
    return this.getCard().setReach(CONFIG.REACH_MELEE); // turn it into a plain melee unit
  }

  getIsActionRelevant(a) {
    // when this unit initially attacks (only blast on explicit initial attacks, not on strike backs or other implicit attacks)
    return a instanceof AttackAction && a.getSource() === this.getCard() && !a.getIsImplicit();
  }

  getAttackableEntities(a) {
    const entities = [];
    const target = a.getTarget();

    if (target != null) {
      // find all other attackable enemy entities
      for (var entity of Array.from<any>(
        this.getGameSession()
          .getBoard()
          .getEnemyEntitiesOnCardinalAxisFromEntityToPosition(
            this.getCard(),
            target.getPosition(),
            CardType.Unit,
            false,
          ),
      )) {
        if (entity !== target) {
          entities.push(entity);
        }
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

  postDeserialize() {
    super.postDeserialize();
    if (this.getCard() != null && this._private.cachedIsActive) {
      // override the attack pattern with blast
      return this.getCard().setCustomAttackPattern(CONFIG.PATTERN_BLAST);
    }
  }
}
ModifierBlastAttack.prototype.type = 'ModifierBlastAttack';
ModifierBlastAttack.keywordDefinition = i18next.t('modifiers.blast_def');
ModifierBlastAttack.modifierName = i18next.t('modifiers.blast_name');
ModifierBlastAttack.prototype.activeInHand = false;
ModifierBlastAttack.prototype.activeInDeck = false;
ModifierBlastAttack.prototype.activeInSignatureCards = false;
ModifierBlastAttack.prototype.activeOnBoard = true;
ModifierBlastAttack.prototype.maxStacks = 1;
ModifierBlastAttack.prototype.fxResource = ['FX.Modifiers.ModifierBlast'];
ModifierBlastAttack.prototype.cardFXResource = ['FX.Cards.Faction3.Blast'];

module.exports = ModifierBlastAttack;
