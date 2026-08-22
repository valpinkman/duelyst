/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EVENTS = require('app/common/event_types');
const AttackAction = require('@duelyst/sdk/actions/attackAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const i18next = require('i18next');
const ModifierAlwaysBackstabbed = require('./modifierAlwaysBackstabbed');

const Modifier = require('./modifier');

class ModifierBackstab extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierBackstab';
  static isKeyworded = true;

  onEvent(event) {
    super.onEvent(event);

    if (this._private.listeningToEvents) {
      if (event.type === EVENTS.modify_action_for_entities_involved_in_attack) {
        return this.onModifyActionForEntitiesInvolvedInAttack(event);
      }
    }
  }

  static createContextObject(backstabBonus, options) {
    if (backstabBonus == null) {
      backstabBonus = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.backstabBonus = backstabBonus;
    return contextObject;
  }

  getIsActionRelevant(a) {
    return (
      a instanceof AttackAction &&
      a.getSource() === this.getCard() &&
      (this.getGameSession()
        .getBoard()
        .getIsPositionBehindEntity(a.getTarget(), this.getCard().getPosition(), 1, 0) ||
        __guard__(a.getTarget(), (x) => x.hasActiveModifierClass(ModifierAlwaysBackstabbed)))
    );
  }

  _modifyAction(a) {
    a.setChangedByModifier(this);
    a.changeDamageBy(this.backstabBonus);
    return a.setIsStrikebackAllowed(false); // backstab attacker does not suffer strikeback
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

  getBackstabBonus() {
    return this.backstabBonus;
  }
}
ModifierBackstab.prototype.type = 'ModifierBackstab';
ModifierBackstab.keywordDefinition = i18next.t('modifiers.backstab_def');
ModifierBackstab.modifierName = i18next.t('modifiers.backstab_name');
ModifierBackstab.prototype.activeInHand = false;
ModifierBackstab.prototype.activeInDeck = false;
ModifierBackstab.prototype.activeInSignatureCards = false;
ModifierBackstab.prototype.activeOnBoard = true;
ModifierBackstab.prototype.fxResource = ['FX.Modifiers.ModifierBackstab'];

module.exports = ModifierBackstab;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
