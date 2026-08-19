/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const BurnCardAction = require('app/sdk/actions/burnCardAction');
const Modifier = require('./modifier');

class ModifierDrawCardWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierDrawCardWatch';
  static modifierName = 'DrawCardWatch';
  static description = 'Whenever you draw a card ...';

  onAction(e) {
    super.onAction(e);

    const {
      action,
    } = e;

    // watch for my player drawing a card
    if (action instanceof DrawCardAction && !(action instanceof BurnCardAction) && (action.getOwnerId() === this.getCard().getOwnerId())) {
      return this.onDrawCardWatch(action);
    }
  }

  onDrawCardWatch(action) {}
}
ModifierDrawCardWatch.prototype.type = 'ModifierDrawCardWatch';
ModifierDrawCardWatch.prototype.activeInHand = false;
ModifierDrawCardWatch.prototype.activeInDeck = false;
ModifierDrawCardWatch.prototype.activeInSignatureCards = false;
ModifierDrawCardWatch.prototype.activeOnBoard = true;
ModifierDrawCardWatch.prototype.fxResource = ['FX.Modifiers.ModifierDrawCardWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierDrawCardWatch;
