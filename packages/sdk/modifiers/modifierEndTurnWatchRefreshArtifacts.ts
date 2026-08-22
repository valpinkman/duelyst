/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RefreshArtifactChargesAction = require('@duelyst/sdk/actions/refreshArtifactChargesAction');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');

class ModifierEndTurnWatchRefreshArtifacts extends ModifierEndTurnWatch {
  declare type: any;

  static type = 'ModifierEndTurnWatchRefreshArtifacts';
  static modifierName = 'End Turn Watch';
  static description = 'At the end of your turn, repair all of your artifacts to full durability';

  onTurnWatch() {
    const refreshArtifactChargesAction = new RefreshArtifactChargesAction(
      this.getCard().getGameSession(),
    );
    // target is your General
    refreshArtifactChargesAction.setTarget(
      this.getCard().getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId()),
    );
    refreshArtifactChargesAction.setSource(this.getCard());
    refreshArtifactChargesAction.setOwnerId(this.getCard().getOwnerId());
    return this.getCard().getGameSession().executeAction(refreshArtifactChargesAction);
  }
}
ModifierEndTurnWatchRefreshArtifacts.prototype.type = 'ModifierEndTurnWatchRefreshArtifacts';

module.exports = ModifierEndTurnWatchRefreshArtifacts;
