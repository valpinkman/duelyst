/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('../../common/config');
const SpellSpawnEntity = require('./spellSpawnEntity');
const CardType = require('../cards/cardType');
const Cards = require('../cards/cardsLookupComplete');
const UtilsGameSession = require('../../common/utils/utils_game_session');
const _ = require('underscore');

class SpellWindShroud extends SpellSpawnEntity {
  declare targetType: any;
  declare spawnSilently: any;
  declare cardDataOrIndexToSpawn: any;

  _findApplyEffectPositions(position, sourceAction) {
    const card = this.getEntityToSpawn();
    const generalPosition = this.getGameSession().getGeneralForPlayerId(this.ownerId).getPosition();
    const applyEffectPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
      this.getGameSession(),
      generalPosition,
      CONFIG.PATTERN_3x3,
      card,
      this,
      1,
    );

    return applyEffectPositions;
  }

  // Wind Shroud picks its apply location by itself, so don't set limits on where it can be cast
  _postFilterPlayPositions(validPositions) {
    return validPositions;
  }
}
SpellWindShroud.prototype.targetType = CardType.Unit;
SpellWindShroud.prototype.spawnSilently = true;
SpellWindShroud.prototype.cardDataOrIndexToSpawn = { id: Cards.Faction3.IronDervish };

module.exports = SpellWindShroud;
