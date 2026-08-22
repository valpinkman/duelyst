/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ReplaceCardFromHandAction = require('@duelyst/sdk/actions/replaceCardFromHandAction');
const Modifier = require('./modifier');

class ModifierReplaceWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierReplaceWatch';
  static modifierName = 'Replace Watch';
  static description = 'Replace Watch';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for my player replacing a card
    if (
      action instanceof ReplaceCardFromHandAction &&
      action.getOwnerId() === this.getCard().getOwnerId()
    ) {
      return this.onReplaceWatch(action);
    }
  }

  onReplaceWatch(action) {}
}
ModifierReplaceWatch.prototype.type = 'ModifierReplaceWatch';
ModifierReplaceWatch.prototype.activeInHand = false;
ModifierReplaceWatch.prototype.activeInDeck = false;
ModifierReplaceWatch.prototype.activeInSignatureCards = false;
ModifierReplaceWatch.prototype.activeOnBoard = true;
ModifierReplaceWatch.prototype.fxResource = ['FX.Modifiers.ModifierReplaceWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierReplaceWatch;
