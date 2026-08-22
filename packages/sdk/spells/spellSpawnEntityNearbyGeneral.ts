const CONFIG = require('app/common/config');
const SpellSpawnEntity = require('./spellSpawnEntity');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');

/*
  Spawns a new entity nearby my general.
*/
class SpellSpawnEntityNearbyGeneral extends SpellSpawnEntity {
  _getPrefilteredValidTargetPositions() {
    // get positions around General
    return UtilsGameSession.getValidBoardPositionsFromPattern(
      this.getGameSession().getBoard(),
      this.getGameSession().getGeneralForPlayerId(this.ownerId).getPosition(),
      CONFIG.PATTERN_3x3,
    );
  }
}

module.exports = SpellSpawnEntityNearbyGeneral;
