/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellSpawnEntity = require('./spellSpawnEntity');
const CardType = require('../cards/cardType');

class SpellSpawnEntityInFrontOfGeneral extends SpellSpawnEntity {
  _findApplyEffectPositions(position, sourceAction) {
    const card = this.getEntityToSpawn();
    const general = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    let applyEffectPositions = [];
    if (general != null) {
      let playerOffset = 0;
      if (this.isOwnedByPlayer1()) { playerOffset = 1; } else { playerOffset = -1; }
      const frontPosition = { x: general.getPosition().x + playerOffset, y: general.getPosition().y };
      if (this.getGameSession().getBoard().isOnBoard(frontPosition)) {
        applyEffectPositions = [frontPosition];
      }
    }

    return applyEffectPositions;
  }

  _postFilterPlayPositions(validPositions) {
    return validPositions;
  }
}
SpellSpawnEntityInFrontOfGeneral.prototype.targetType = CardType.Unit;
SpellSpawnEntityInFrontOfGeneral.prototype.spawnSilently = true;

module.exports = SpellSpawnEntityInFrontOfGeneral;
