/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');

class SpellLostInTheDesert extends Spell {
  declare damageAmount: any;

  _findApplyEffectPositions(position, sourceAction) {
    const applyPositions = [];

    const board = this.getGameSession().getBoard();
    const general = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    const enemyUnits = board.getEnemyEntitiesForEntity(general, CardType.Unit);
    const player = this.getGameSession().getPlayerById(this.getOwnerId());

    for (var unit of Array.from<any>(enemyUnits)) {
      if (unit != null) {
        var unitsNearby = board.getFriendlyEntitiesAroundEntity(unit, CardType.Unit, 1);
        if (unitsNearby.length === 0) {
          applyPositions.push(unit.getPosition());
        }
      }
    }

    return applyPositions;
  }

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.ownerId);
    damageAction.setTarget(board.getUnitAtPosition({ x, y }));
    damageAction.setDamageAmount(this.damageAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
SpellLostInTheDesert.prototype.damageAmount = 5;

module.exports = SpellLostInTheDesert;
