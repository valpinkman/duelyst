/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomTeleportAction = require('app/sdk/actions/randomTeleportAction');
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const _ = require('underscore');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchRandomTeleport extends ModifierTakeDamageWatch {
  declare type: any;

  static type = 'ModifierTakeDamageWatchRandomTeleport';
  static description = 'Whenever this minion takes damage, it randomly teleports';

  onDamageTaken(action) {
    super.onDamageTaken(action);

    const randomTeleportAction = new RandomTeleportAction(this.getGameSession());
    randomTeleportAction.setOwnerId(this.getCard().getOwnerId());
    randomTeleportAction.setSource(this.getCard());
    randomTeleportAction.setFXResource(
      _.union(randomTeleportAction.getFXResource(), this.getFXResource()),
    );
    return this.getGameSession().executeAction(randomTeleportAction);
  }
}
ModifierTakeDamageWatchRandomTeleport.prototype.type = 'ModifierTakeDamageWatchRandomTeleport';

module.exports = ModifierTakeDamageWatchRandomTeleport;
