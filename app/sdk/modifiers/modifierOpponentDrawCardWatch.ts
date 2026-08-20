/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const BurnCardAction = require('app/sdk/actions/burnCardAction');
const Modifier = require('./modifier');

class ModifierOpponentDrawCardWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierOpponentDrawCardWatch';
  static modifierName = 'ModifierOpponentDrawCardWatch';
  static description = 'Whenever your opponent draws a card ...';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for opponent player drawing a card
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      if (
        action instanceof DrawCardAction &&
        !(action instanceof BurnCardAction) &&
        action.getOwnerId() !== this.getCard().getOwnerId()
      ) {
        return this.onDrawCardWatch(action);
      }
    }
  }

  onDrawCardWatch(action) {}
}
ModifierOpponentDrawCardWatch.prototype.type = 'ModifierOpponentDrawCardWatch';
ModifierOpponentDrawCardWatch.prototype.activeInHand = false;
ModifierOpponentDrawCardWatch.prototype.activeInDeck = false;
ModifierOpponentDrawCardWatch.prototype.activeInSignatureCards = false;
ModifierOpponentDrawCardWatch.prototype.activeOnBoard = true;
ModifierOpponentDrawCardWatch.prototype.fxResource = ['FX.Modifiers.ModifierOpponentDrawCardWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierOpponentDrawCardWatch;
