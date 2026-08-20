/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const BurnCardAction = require('app/sdk/actions/burnCardAction');
const Modifier = require('./modifier');

class ModifierAnyDrawCardWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierAnyDrawCardWatch';
  static modifierName = 'AnyDrawCardWatch';
  static description = 'Whenever any player draws a card ...';

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // watch for my player drawing a card
    if (action instanceof DrawCardAction && !(action instanceof BurnCardAction)) {
      return this.onDrawCardWatch(action);
    }
  }

  onDrawCardWatch(action) {}
}
ModifierAnyDrawCardWatch.prototype.type = 'ModifierAnyDrawCardWatch';
ModifierAnyDrawCardWatch.prototype.activeInHand = false;
ModifierAnyDrawCardWatch.prototype.activeInDeck = false;
ModifierAnyDrawCardWatch.prototype.activeInSignatureCards = false;
ModifierAnyDrawCardWatch.prototype.activeOnBoard = true;
ModifierAnyDrawCardWatch.prototype.fxResource = ['FX.Modifiers.ModifierAnyDrawCardWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierAnyDrawCardWatch;
