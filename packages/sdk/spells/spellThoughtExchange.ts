/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const IntentType = require('@duelyst/sdk/intentType');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const SwapUnitAllegianceAction = require('@duelyst/sdk/actions/swapUnitAllegianceAction');

class SpellThoughtExchange extends Spell {
  declare targetType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const entity = board.getUnitAtPosition(applyEffectPosition);
    const surroundingEnemies = board.getEnemyEntitiesAroundEntity(entity, this.targetType);
    const attackThreshold = entity.getATK();
    const a = new SwapUnitAllegianceAction(this.getGameSession());
    a.setTarget(entity);
    this.getGameSession().executeAction(a);

    if (surroundingEnemies.length > 0) {
      return (() => {
        const result = [];
        for (var enemy of Array.from<any>(surroundingEnemies)) {
          if (enemy.getATK() < attackThreshold && !enemy.getIsGeneral()) {
            var swapAction = new SwapUnitAllegianceAction(this.getGameSession());
            swapAction.setTarget(enemy);
            result.push(this.getGameSession().executeAction(swapAction));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
SpellThoughtExchange.prototype.targetType = CardType.Unit;

module.exports = SpellThoughtExchange;
