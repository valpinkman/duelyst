/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const IntentType = require('@duelyst/sdk/intentType');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const SwapUnitAllegianceAction = require('@duelyst/sdk/actions/swapUnitAllegianceAction');

class SpellEnslave extends Spell {
  declare targetType: any;
  declare spellFilterType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellEnslave::onApplyEffectToBoardTile"

    const applyEffectPosition = { x, y };
    const entity = board.getCardAtPosition(applyEffectPosition, this.targetType);
    const a = new SwapUnitAllegianceAction(this.getGameSession());
    a.setTarget(entity);
    return this.getGameSession().executeAction(a);
  }
}
SpellEnslave.prototype.targetType = CardType.Unit;
SpellEnslave.prototype.spellFilterType = SpellFilterType.EnemyDirect;

module.exports = SpellEnslave;
