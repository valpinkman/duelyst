/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const ApplyCardToBoardAction = require('app/sdk/actions/applyCardToBoardAction');
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const CloneEntityAsTransformAction = require('app/sdk/actions/cloneEntityAsTransformAction');
const Modifier = require('./modifier');

class ModifierOpponentSummonWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierOpponentSummonWatch';
  static modifierName = 'Opponent Summon Watch';
  static description = 'Opponent Summon Watch';

  onAfterCleanupAction(e) {
    super.onAfterCleanupAction(e);

    const { action } = e;

    // watch for a unit being summoned in any way by the opponent of player who owns this entity
    if (
      action instanceof ApplyCardToBoardAction &&
      action.getOwnerId() !== this.getCard().getOwnerId() &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Unit &&
      action.getCard() !== this.getCard()
    ) {
      // don't react to transforms
      if (
        !(
          action instanceof PlayCardAsTransformAction ||
          action instanceof CloneEntityAsTransformAction
        )
      ) {
        return this.onSummonWatch(action);
      }
    }
  }

  onSummonWatch(action) {}
}
ModifierOpponentSummonWatch.prototype.type = 'ModifierOpponentSummonWatch';
ModifierOpponentSummonWatch.prototype.activeInHand = false;
ModifierOpponentSummonWatch.prototype.activeInDeck = false;
ModifierOpponentSummonWatch.prototype.activeInSignatureCards = false;
ModifierOpponentSummonWatch.prototype.activeOnBoard = true;
ModifierOpponentSummonWatch.prototype.fxResource = ['FX.Modifiers.ModifierOpponentSummonWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierOpponentSummonWatch;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
