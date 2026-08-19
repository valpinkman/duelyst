/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const MoveAction = require('app/sdk/actions/moveAction');
const TeleportAction = require('app/sdk/actions/teleportAction');
const SwapUnitsAction = require('app/sdk/actions/swapUnitsAction');
const Modifier = require('./modifier');

class ModifierMyMoveWatchAnyReason extends Modifier {
  static type = 'ModifierMyMoveWatchAnyReason';
  static modifierName = 'Move Watch Any Reason: Self';
  static description = 'Move Watch Any Reason: Self';

  onAction(event) {
    super.onAction(event);
    const {
      action,
    } = event;

    if ((action instanceof MoveAction || (action instanceof TeleportAction && action.getIsValidTeleport())) && (action.getSource() === this.getCard())) {
      return this.onMyMoveWatchAnyReason(action);
    } if (action instanceof SwapUnitsAction && ((action.getSource() === this.getCard()) || (action.getTarget() === this.getCard()))) {
      return this.onMyMoveWatchAnyReason(action);
    }
  }

  onMyMoveWatchAnyReason(action) {}
}
ModifierMyMoveWatchAnyReason.prototype.type = 'ModifierMyMoveWatchAnyReason';
ModifierMyMoveWatchAnyReason.prototype.activeInHand = false;
ModifierMyMoveWatchAnyReason.prototype.activeInDeck = false;
ModifierMyMoveWatchAnyReason.prototype.activeInSignatureCards = false;
ModifierMyMoveWatchAnyReason.prototype.activeOnBoard = true;
ModifierMyMoveWatchAnyReason.prototype.fxResource = ['FX.Modifiers.ModifierMyMoveWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyMoveWatchAnyReason;
