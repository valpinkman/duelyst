/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const SpellKillTarget = require('./spellKillTarget');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');

class SpellKillTargetSpawnEntity extends SpellKillTarget {
  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    if (this.cardDataOrIndexToSpawn) {
      const spawnEntityAction = new PlayCardSilentlyAction(this.getGameSession(), this.getOwnerId(), x, y, this.cardDataOrIndexToSpawn);
      return this.getGameSession().executeAction(spawnEntityAction);
    }
  }
}
SpellKillTargetSpawnEntity.prototype.cardDataOrIndexToSpawn = null;

module.exports = SpellKillTargetSpawnEntity;
