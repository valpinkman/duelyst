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

class SpellShadowspawn extends SpellSpawnEntity {
  declare targetType: any;
  declare spawnSilently: any;
  declare numUnits: any;
  declare cardDataOrIndexToSpawn: any;

  _findApplyEffectPositions(position, sourceAction) {
    let applyEffectPositions;
    const card = this.getEntityToSpawn();
    const generalPosition = this.getGameSession().getGeneralForPlayerId(this.ownerId).getPosition();
    const numberOfApplyPositions = this.numUnits;

    if (numberOfApplyPositions > 0) {
      applyEffectPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        generalPosition,
        CONFIG.PATTERN_3x3,
        card,
        this,
        numberOfApplyPositions,
      );
    } else {
      applyEffectPositions = [];
    }

    return applyEffectPositions;
  }

  getAppliesSameEffectToMultipleTargets() {
    return true;
  }

  // Shadowspawn picks its apply locations by itself, so don't set limits on where it can be cast
  _postFilterPlayPositions(validPositions) {
    return validPositions;
  }
}
SpellShadowspawn.prototype.targetType = CardType.Unit;
SpellShadowspawn.prototype.spawnSilently = true;
SpellShadowspawn.prototype.numUnits = 2;
SpellShadowspawn.prototype.cardDataOrIndexToSpawn = { id: Cards.Faction4.Wraithling };

module.exports = SpellShadowspawn;
