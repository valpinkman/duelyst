/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const SpellRemoveTarget = require('./spellRemoveTarget');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');

class SpellRemoveTargetSpawnEntity extends SpellRemoveTarget {
  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    if (this.cardDataOrIndexToSpawn) {
      const spawnEntityAction = new PlayCardSilentlyAction(this.getGameSession(), this.getOwnerId(), x, y, this.cardDataOrIndexToSpawn);
      return this.getGameSession().executeAction(spawnEntityAction);
    }
  }
}
SpellRemoveTargetSpawnEntity.prototype.cardDataOrIndexToSpawn = null;

module.exports = SpellRemoveTargetSpawnEntity;
