/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const RefreshArtifactChargesAction = require('app/sdk/actions/refreshArtifactChargesAction');
const CONFIG = require('app/common/config');
const Modifier = require('./modifier');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitRefreshArtifacts extends ModifierOpeningGambit {
  static initClass() {
    this.prototype.type = 'ModifierOpeningGambitRefreshArtifacts';
    this.type = 'ModifierOpeningGambitRefreshArtifacts';

    this.modifierName = 'Opening Gambit';
    this.description = 'Repair all of your artifacts to full durability';
  }

  onOpeningGambit() {
    const refreshArtifactChargesAction = new RefreshArtifactChargesAction(this.getCard().getGameSession());
    // target is your General
    refreshArtifactChargesAction.setTarget(this.getCard().getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId()));
    refreshArtifactChargesAction.setSource(this.getCard());
    refreshArtifactChargesAction.setOwnerId(this.getCard().getOwnerId());
    return this.getCard().getGameSession().executeAction(refreshArtifactChargesAction);
  }
}
ModifierOpeningGambitRefreshArtifacts.initClass();

module.exports = ModifierOpeningGambitRefreshArtifacts;
