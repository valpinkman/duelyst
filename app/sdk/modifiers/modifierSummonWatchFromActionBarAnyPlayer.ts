/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardFromHandAction = require('app/sdk/actions/playCardFromHandAction');
const CardType = require('app/sdk/cards/cardType');
const PlayCardAsTransformAction = require('app/sdk/actions/playCardAsTransformAction');
const CloneEntityAsTransformAction = require('app/sdk/actions/cloneEntityAsTransformAction');
const Modifier = require('./modifier');

class ModifierSummonWatchFromActionBarAnyPlayer extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchFromActionBarAnyPlayer';
  static modifierName = 'Summon Watch Any Player';
  static description = 'Summon Watch Any Player';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for a unit being summoned in any way by any player, but don't react to transforms
    if (this.getIsActionRelevant(action) && this.getIsCardRelevantToWatcher(action.getCard())) {
      return this.onSummonWatch(action);
    }
  }

  getIsActionRelevant(action) {
    return (
      action instanceof PlayCardFromHandAction &&
      __guard__(action.getCard(), (x) => x.type) === CardType.Unit &&
      action.getCard() !== this.getCard() &&
      !(
        action instanceof PlayCardAsTransformAction ||
        action instanceof CloneEntityAsTransformAction
      )
    );
  }

  onSummonWatch(action) {}
  // override me in sub classes to implement special behavior

  getIsCardRelevantToWatcher(card) {
    return true;
  }
}
ModifierSummonWatchFromActionBarAnyPlayer.prototype.type =
  'ModifierSummonWatchFromActionBarAnyPlayer';
ModifierSummonWatchFromActionBarAnyPlayer.prototype.activeInHand = false;
ModifierSummonWatchFromActionBarAnyPlayer.prototype.activeInDeck = false;
ModifierSummonWatchFromActionBarAnyPlayer.prototype.activeInSignatureCards = false;
ModifierSummonWatchFromActionBarAnyPlayer.prototype.activeOnBoard = true;
ModifierSummonWatchFromActionBarAnyPlayer.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
];
// override me in sub classes to implement special behavior

module.exports = ModifierSummonWatchFromActionBarAnyPlayer;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
