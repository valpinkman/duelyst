/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const MoveAction = require('app/sdk/actions/moveAction');
const TeleportAction = require('app/sdk/actions/teleportAction');
const SwapUnitsAction = require('app/sdk/actions/swapUnitsAction');
const Modifier = require('./modifier');

class ModifierEnemyTeamMoveWatch extends Modifier {
  static type = 'ModifierEnemyTeamMoveWatch';
  static modifierName = 'Any Move Watch: Enemy';
  static description = 'Whenever an enemy minion is moved for any reason...';

  onAction(event) {
    super.onAction(event);
    const {
      action,
    } = event;
    if ((action instanceof MoveAction || (action instanceof TeleportAction && action.getIsValidTeleport())) && (action.getSource().getOwnerId() === this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId()).getOwnerId()) && !__guardMethod__(action.getSource(), 'getIsGeneral', (o) => o.getIsGeneral())) {
      return this.onEnemyTeamMoveWatch(action, action.getSource());
    } if (action instanceof SwapUnitsAction) { // for swap units action, must check both source AND target (both could be on my team)
      if ((action.getSource().getOwnerId() === this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId()).getOwnerId()) && !__guardMethod__(action.getSource(), 'getIsGeneral', (o1) => o1.getIsGeneral())) {
        this.onEnemyTeamMoveWatch(action, action.getSource());
      }
      if ((action.getTarget().getOwnerId() === this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId()).getOwnerId()) && !__guardMethod__(action.getSource(), 'getIsGeneral', (o2) => o2.getIsGeneral())) {
        return this.onEnemyTeamMoveWatch(action, action.getTarget());
      }
    }
  }

  onEnemyTeamMoveWatch(action, movingTarget) {}
}
ModifierEnemyTeamMoveWatch.prototype.type = 'ModifierEnemyTeamMoveWatch';
ModifierEnemyTeamMoveWatch.prototype.activeInHand = false;
ModifierEnemyTeamMoveWatch.prototype.activeInDeck = false;
ModifierEnemyTeamMoveWatch.prototype.activeInSignatureCards = false;
ModifierEnemyTeamMoveWatch.prototype.activeOnBoard = true;
ModifierEnemyTeamMoveWatch.prototype.fxResource = ['FX.Modifiers.ModifierMyMoveWatch'];
// override me in sub classes to implement special behavior

module.exports = ModifierEnemyTeamMoveWatch;

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  }
  return undefined;
}
