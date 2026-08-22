/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const RandomTeleportAction = require('@duelyst/sdk/actions/randomTeleportAction');
const CONFIG = require('@duelyst/common/config');
const _ = require('underscore');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchTeleportRandomSpace extends ModifierStartTurnWatch {
  declare type: any;

  static type = 'ModifierStartTurnWatchTeleportRandomSpace';
  static description = 'At the start of your turn, teleport to a random location';

  onTurnWatch(action) {
    super.onTurnWatch(action);

    const randomTeleportAction = new RandomTeleportAction(this.getGameSession());
    randomTeleportAction.setOwnerId(this.getCard().getOwnerId());
    randomTeleportAction.setSource(this.getCard());
    randomTeleportAction.setFXResource(
      _.union(randomTeleportAction.getFXResource(), this.getFXResource()),
    );
    return this.getGameSession().executeAction(randomTeleportAction);
  }
}
ModifierStartTurnWatchTeleportRandomSpace.prototype.type =
  'ModifierStartTurnWatchTeleportRandomSpace';

module.exports = ModifierStartTurnWatchTeleportRandomSpace;
