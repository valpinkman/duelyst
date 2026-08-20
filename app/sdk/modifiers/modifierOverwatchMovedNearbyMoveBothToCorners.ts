/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const _ = require('underscore');
const ModifierOverwatchMovedNearby = require('./modifierOverwatchMovedNearby');
const RandomTeleportAction = require('../actions/randomTeleportAction');

class ModifierOverwatchMovedNearbyMoveBothToCorners extends ModifierOverwatchMovedNearby {
  declare type: any;

  static type = 'ModifierOverwatchMovedNearbyMoveBothToCorners';

  onOverwatch(action) {
    // teleport enemy
    let randomTeleportAction = new RandomTeleportAction(this.getGameSession());
    randomTeleportAction.setOwnerId(this.getCard().getOwnerId());
    randomTeleportAction.setSource(action.getSource());
    randomTeleportAction.setTeleportPattern(CONFIG.PATTERN_CORNERS);
    randomTeleportAction.setFXResource(
      _.union(randomTeleportAction.getFXResource(), this.getFXResource()),
    );
    this.getGameSession().executeAction(randomTeleportAction);

    // teleport self
    randomTeleportAction = new RandomTeleportAction(this.getGameSession());
    randomTeleportAction.setOwnerId(this.getCard().getOwnerId());
    randomTeleportAction.setSource(this.getCard());
    randomTeleportAction.setTeleportPattern(CONFIG.PATTERN_CORNERS);
    randomTeleportAction.setFXResource(
      _.union(randomTeleportAction.getFXResource(), this.getFXResource()),
    );
    return this.getGameSession().executeAction(randomTeleportAction);
  }
}
ModifierOverwatchMovedNearbyMoveBothToCorners.prototype.type =
  'ModifierOverwatchMovedNearbyMoveBothToCorners';

module.exports = ModifierOverwatchMovedNearbyMoveBothToCorners;
