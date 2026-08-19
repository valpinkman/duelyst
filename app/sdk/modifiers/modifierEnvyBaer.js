/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomTeleportAction = require('app/sdk/actions/randomTeleportAction');
const CONFIG = require('app/common/config');
const _ = require('underscore');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierEnvyBaer extends ModifierDealDamageWatch {
  static type = 'ModifierEnvyBaer';
  static modifierName = 'Envybaer';
  static description = 'Whenever this minion damages an enemy, teleport that enemy to a random corner';

  onDealDamage(action) {
    if (action.getTarget().getOwnerId() !== this.getCard().getOwnerId()) {
      const randomTeleportAction = new RandomTeleportAction(this.getGameSession());
      randomTeleportAction.setOwnerId(this.getCard().getOwnerId());
      randomTeleportAction.setSource(action.getTarget());
      randomTeleportAction.setTeleportPattern(CONFIG.PATTERN_CORNERS);
      randomTeleportAction.setFXResource(_.union(randomTeleportAction.getFXResource(), this.getFXResource()));
      return this.getGameSession().executeAction(randomTeleportAction);
    }
  }
}
ModifierEnvyBaer.prototype.type = 'ModifierEnvyBaer';
ModifierEnvyBaer.prototype.maxStacks = 1;

module.exports = ModifierEnvyBaer;
