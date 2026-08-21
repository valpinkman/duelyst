/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const SpellSpawnEntity = require('./spellSpawnEntity');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const DamageAction = require('app/sdk/actions/damageAction');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const CONFIG = require('app/common/config');

class SpellDamageAndSpawnEntitiesNearbyGeneral extends SpellSpawnEntity {
  declare targetType: any;
  declare spellFilterType: any;
  declare damageAmount: any;
  declare spawnSilently: any;
  declare numUnits: any;
  declare cardDataOrIndexToSpawn: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const target = board.getCardAtPosition({ x, y }, this.targetType);

    if (target != null && target.getOwnerId() !== this.getOwnerId()) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.ownerId);
      damageAction.setTarget(target);
      damageAction.setDamageAmount(this.damageAmount);
      return this.getGameSession().executeAction(damageAction);
    }
  }

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

    applyEffectPositions.push(position);

    return applyEffectPositions;
  }

  // Wind Shroud picks its apply location by itself, so don't set limits on where it can be cast
  _postFilterPlayPositions(validPositions) {
    return validPositions;
  }
}
SpellDamageAndSpawnEntitiesNearbyGeneral.prototype.targetType = CardType.Unit;
SpellDamageAndSpawnEntitiesNearbyGeneral.prototype.spellFilterType = SpellFilterType.EnemyDirect;
SpellDamageAndSpawnEntitiesNearbyGeneral.prototype.damageAmount = 2;
SpellDamageAndSpawnEntitiesNearbyGeneral.prototype.spawnSilently = true;
SpellDamageAndSpawnEntitiesNearbyGeneral.prototype.numUnits = 2;
SpellDamageAndSpawnEntitiesNearbyGeneral.prototype.cardDataOrIndexToSpawn = {
  id: Cards.Neutral.Spellspark,
};

module.exports = SpellDamageAndSpawnEntitiesNearbyGeneral;
