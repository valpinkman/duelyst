/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RefreshExhaustionAction = require('app/sdk/actions/refreshExhaustionAction');
const ApplyExhaustionAction = require('app/sdk/actions/applyExhaustionAction');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierFirstBlood extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierFirstBlood';
  static isKeyworded = true;

  onActivate() {
    super.onActivate();
    // if rush is applied on the turn that the unit was summoned
    if (
      this.getGameSession().wasActionExecutedDuringTurn(
        this.getCard().getAppliedToBoardByAction(),
        this.getGameSession().getCurrentTurn(),
      ) &&
      this.getGameSession().getCanCardBeScheduledForRemoval(this.getCard())
    ) {
      // immediately activate the unit IF it has not already moved and / or attacked this turn (do not re-activate units that already had rush)
      if (this.getCard().getMovesMade() === 0 && this.getCard().getAttacksMade() === 0) {
        const refreshExhaustionAction = this.getGameSession().createActionForType(
          RefreshExhaustionAction.type,
        );
        refreshExhaustionAction.setSource(this.getCard());
        refreshExhaustionAction.setTarget(this.getCard());
        return this.getCard().getGameSession().executeAction(refreshExhaustionAction);
      }
    }
  }

  deactivateRushIfNeeded() {
    // if rush is dispelled, deactivated, or removed on the turn that the unit was summoned
    // immediately exhaust the unit
    if (
      this.getGameSession().wasActionExecutedDuringTurn(
        __guard__(this.getCard(), (x) => x.getAppliedToBoardByAction()),
        this.getGameSession().getCurrentTurn(),
      ) &&
      this.getGameSession().getCanCardBeScheduledForRemoval(this.getCard())
    ) {
      const applyExhaustionAction = this.getGameSession().createActionForType(
        ApplyExhaustionAction.type,
      );
      applyExhaustionAction.setSource(this.getCard());
      applyExhaustionAction.setTarget(this.getCard());
      return this.getGameSession().executeAction(applyExhaustionAction);
    }
  }

  onDeactivate() {
    super.onDeactivate();
    return this.deactivateRushIfNeeded();
  }

  onRemoveFromCard() {
    super.onRemoveFromCard();
    return this.deactivateRushIfNeeded();
  }
}
ModifierFirstBlood.prototype.type = 'ModifierFirstBlood';
ModifierFirstBlood.keywordDefinition = i18next.t('modifiers.rush_def');
ModifierFirstBlood.prototype.maxStacks = 1;
ModifierFirstBlood.modifierName = i18next.t('modifiers.rush_name');
ModifierFirstBlood.prototype.activeInHand = false;
ModifierFirstBlood.prototype.activeInDeck = false;
ModifierFirstBlood.prototype.activeInSignatureCards = false;
ModifierFirstBlood.prototype.activeOnBoard = true;
ModifierFirstBlood.prototype.fxResource = ['FX.Modifiers.ModifierFirstBlood'];

module.exports = ModifierFirstBlood;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
