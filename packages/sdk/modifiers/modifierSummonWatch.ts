/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const PlayCardAsTransformAction = require('@duelyst/sdk/actions/playCardAsTransformAction');
const CloneEntityAsTransformAction = require('@duelyst/sdk/actions/cloneEntityAsTransformAction');
const Modifier = require('./modifier');

class ModifierSummonWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatch';
  static modifierName = 'Summon Watch';
  static description = 'Summon Watch';

  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const { action } = e;

    // watch for a unit being summoned in any way by the player who owns this entity, but don't react to transforms
    if (this.getIsActionRelevant(action) && this.getIsCardRelevantToWatcher(action.getCard())) {
      return this.onSummonWatch(action);
    }
  }

  getIsActionRelevant(action) {
    return (
      action instanceof ApplyCardToBoardAction &&
      action.getOwnerId() === this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Unit &&
      action.getCard() !== this.getCard() &&
      !(
        action instanceof PlayCardAsTransformAction ||
        action instanceof CloneEntityAsTransformAction
      )
    );
  }

  onSummonWatch(action?) {}
  // override me in sub classes to implement special behavior

  getIsCardRelevantToWatcher(card) {
    return true;
  }
}
ModifierSummonWatch.prototype.type = 'ModifierSummonWatch';
ModifierSummonWatch.prototype.activeInHand = false;
ModifierSummonWatch.prototype.activeInDeck = false;
ModifierSummonWatch.prototype.activeInSignatureCards = false;
ModifierSummonWatch.prototype.activeOnBoard = true;
ModifierSummonWatch.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierSummonWatch;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
