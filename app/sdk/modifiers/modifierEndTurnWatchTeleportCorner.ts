/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomTeleportAction = require('app/sdk/actions/randomTeleportAction');
const CONFIG = require('app/common/config');
const _ = require('underscore');
const ModifierEndTurnWatch = require('./modifierEndTurnWatch');

class ModifierEndTurnWatchTeleportCorner extends ModifierEndTurnWatch {
  declare type: any;
  declare isHiddenToUI: any;
  declare fxResource: any;

  static type = 'ModifierEndTurnWatchTeleportCorner';
  static modifierName = 'Turn Watch';
  static description = 'At the end of your turn, teleport to a random corner';

  onTurnWatch(action) {
    super.onTurnWatch(action);

    const randomTeleportAction = new RandomTeleportAction(this.getGameSession());
    randomTeleportAction.setOwnerId(this.getCard().getOwnerId());
    randomTeleportAction.setSource(this.getCard());
    randomTeleportAction.setTeleportPattern(CONFIG.PATTERN_CORNERS);
    randomTeleportAction.setFXResource(
      _.union(randomTeleportAction.getFXResource(), this.getFXResource()),
    );
    return this.getGameSession().executeAction(randomTeleportAction);
  }
}
ModifierEndTurnWatchTeleportCorner.prototype.type = 'ModifierEndTurnWatchTeleportCorner';
ModifierEndTurnWatchTeleportCorner.prototype.isHiddenToUI = true;
ModifierEndTurnWatchTeleportCorner.prototype.fxResource = ['FX.Modifiers.ModifierEndTurnWatch'];

module.exports = ModifierEndTurnWatchTeleportCorner;
