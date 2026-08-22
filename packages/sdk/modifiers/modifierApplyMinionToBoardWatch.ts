/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ApplyCardToBoardAction = require('@duelyst/sdk/actions/applyCardToBoardAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const PlayCardAsTransformAction = require('@duelyst/sdk/actions/playCardAsTransformAction');
const Modifier = require('./modifier');

class ModifierApplyMinionToBoardWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierApplyMinionToBoardWatch';
  static modifierName = 'Any ApplyToBoard Watch';
  static description = 'Any ApplyToBoard Watch';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for a unit being applied to board in any way by any player (except transforms)
    if (
      action instanceof ApplyCardToBoardAction &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Unit &&
      action.getCard() !== this.getCard()
    ) {
      if (!(action instanceof PlayCardAsTransformAction)) {
        return this.onApplyToBoardWatch(action);
      }
    }
  }

  onApplyToBoardWatch(action) {}
}
ModifierApplyMinionToBoardWatch.prototype.type = 'ModifierApplyMinionToBoardWatch';
ModifierApplyMinionToBoardWatch.prototype.activeInHand = false;
ModifierApplyMinionToBoardWatch.prototype.activeInDeck = false;
ModifierApplyMinionToBoardWatch.prototype.activeInSignatureCards = false;
ModifierApplyMinionToBoardWatch.prototype.activeOnBoard = true;
ModifierApplyMinionToBoardWatch.prototype.fxResource = [
  'FX.Modifiers.ModifierApplyMinionToBoardWatch',
];
// override me in sub classes to implement special behavior

module.exports = ModifierApplyMinionToBoardWatch;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
