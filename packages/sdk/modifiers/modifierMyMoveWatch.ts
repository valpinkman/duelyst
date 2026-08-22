/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const MoveAction = require('@duelyst/sdk/actions/moveAction');
const Modifier = require('./modifier');

class ModifierMyMoveWatch extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyMoveWatch';
  static modifierName = 'Move Watch: Self';
  static description = 'Move Watch: Self';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    if (action instanceof MoveAction && action.getSource() === this.getCard()) {
      return this.onMyMoveWatch(action);
    }
  }

  onMyMoveWatch(action) {}
}
ModifierMyMoveWatch.prototype.type = 'ModifierMyMoveWatch';
ModifierMyMoveWatch.prototype.activeInHand = false;
ModifierMyMoveWatch.prototype.activeInDeck = false;
ModifierMyMoveWatch.prototype.activeInSignatureCards = false;
ModifierMyMoveWatch.prototype.activeOnBoard = true;
ModifierMyMoveWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyMoveWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyMoveWatch;
