/*
 * decaffeinate suggestions:
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellSpawnEntity = require('./spellSpawnEntity');
const CONFIG = require('@duelyst/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');

class SpellSpawnTilesInCenterColumn extends SpellSpawnEntity {
  declare cardDataOrIndexToSpawn: any;

  _findApplyEffectPositions(position, sourceAction) {
    const board = this.getGameSession().getBoard();
    const centerPosition = { x: 4, y: 2 };
    const applyEffectPositions = [];
    const validSpawnLocations = UtilsGameSession.getValidBoardPositionsFromPattern(
      board,
      centerPosition,
      CONFIG.PATTERN_WHOLE_COLUMN,
      true,
    );
    if ((validSpawnLocations != null ? validSpawnLocations.length : undefined) > 0) {
      for (
        let i = 0, end = validSpawnLocations.length, asc = end >= 0;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
        applyEffectPositions.push(validSpawnLocations[i]);
      }
    }

    return applyEffectPositions;
  }

  getAppliesSameEffectToMultipleTargets() {
    return true;
  }
}
SpellSpawnTilesInCenterColumn.prototype.cardDataOrIndexToSpawn = null;

module.exports = SpellSpawnTilesInCenterColumn;
