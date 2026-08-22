/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const MoveAction = require('@duelyst/sdk/actions/moveAction');
const TeleportAction = require('@duelyst/sdk/actions/teleportAction');
const SwapUnitsAction = require('@duelyst/sdk/actions/swapUnitsAction');
const Modifier = require('./modifier');

class ModifierMyTeamMoveWatchAnyReason extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;

  static type = 'ModifierMyTeamMoveWatchAnyReason';
  static modifierName = 'Any Move Watch: Self';
  static description = 'Whenever a friendly minion is moved for any reason...';

  onAction(event) {
    super.onAction(event);
    const { action } = event;
    if (
      (action instanceof MoveAction ||
        (action instanceof TeleportAction && action.getIsValidTeleport())) &&
      action.getSource().getOwnerId() === this.getCard().getOwnerId() &&
      !__guardMethod__(action.getSource(), 'getIsGeneral', (o) => o.getIsGeneral())
    ) {
      return this.onMyTeamMoveWatch(action, action.getSource());
    }
    if (action instanceof SwapUnitsAction) {
      // for swap units action, must check both source AND target (both could be on my team)
      if (
        action.getSource().getOwnerId() === this.getCard().getOwnerId() &&
        !__guardMethod__(action.getSource(), 'getIsGeneral', (o1) => o1.getIsGeneral())
      ) {
        this.onMyTeamMoveWatch(action, action.getSource());
      }
      if (
        action.getTarget().getOwnerId() === this.getCard().getOwnerId() &&
        !__guardMethod__(action.getTarget(), 'getIsGeneral', (o2) => o2.getIsGeneral())
      ) {
        return this.onMyTeamMoveWatch(action, action.getTarget());
      }
    }
  }

  onMyTeamMoveWatch(action, buffTarget) {}
}
ModifierMyTeamMoveWatchAnyReason.prototype.type = 'ModifierMyTeamMoveWatchAnyReason';
ModifierMyTeamMoveWatchAnyReason.prototype.activeInHand = false;
ModifierMyTeamMoveWatchAnyReason.prototype.activeInDeck = false;
ModifierMyTeamMoveWatchAnyReason.prototype.activeInSignatureCards = false;
ModifierMyTeamMoveWatchAnyReason.prototype.activeOnBoard = true;
ModifierMyTeamMoveWatchAnyReason.prototype.fxResource = ['FX.Modifiers.ModifierMyMoveWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierMyTeamMoveWatchAnyReason;

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  }
  return undefined;
}
