/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RestoreChargeToAllArtifactsAction = require('app/sdk/actions/restoreChargeToAllArtifactsAction');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchRestoreChargeToArtifacts extends ModifierStartTurnWatch {
  static type = 'ModifierStartTurnWatchRestoreChargeToArtifacts';

  onTurnWatch(action) {
    super.onTurnWatch(action);

    const myGeneral = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());

    const restoreDurabilityAction = new RestoreChargeToAllArtifactsAction(this.getGameSession());
    restoreDurabilityAction.setTarget(myGeneral);
    return this.getCard().getGameSession().executeAction(restoreDurabilityAction);
  }
}
ModifierStartTurnWatchRestoreChargeToArtifacts.prototype.type = 'ModifierStartTurnWatchRestoreChargeToArtifacts';

module.exports = ModifierStartTurnWatchRestoreChargeToArtifacts;
