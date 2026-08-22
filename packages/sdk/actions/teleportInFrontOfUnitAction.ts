/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const TeleportAction = require('./teleportAction');
const CardType = require('@duelyst/sdk/cards/cardType');

class TeleportInFrontOfUnitAction extends TeleportAction {
  static type = 'TeleportInFrontOfUnitAction';

  constructor(gameSession, inFrontOfUnit, targetUnit) {
    super(gameSession);
    this._private.inFrontOfUnit = inFrontOfUnit;
    this.setSource(targetUnit);
  }

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.inFrontOfUnit = null; // used by the authoritative source action to know where to teleport

    return p;
  }

  _execute() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      // only do calculations server-side
      if (this._private.inFrontOfUnit != null && this.getSource()) {
        // calculate "in front of me"
        const position = this._private.inFrontOfUnit.getPosition();
        position.x += this._private.inFrontOfUnit.isOwnedByPlayer1() ? 1 : -1;
        // now set the target position (this is what TeleportAction expects)
        this.setTargetPosition(position);
        return super._execute(); // and execute the teleport
      }
    } else {
      return super._execute();
    }
  }
}
// when not running as authoritative, use authoritative source action's data

module.exports = TeleportInFrontOfUnitAction;
