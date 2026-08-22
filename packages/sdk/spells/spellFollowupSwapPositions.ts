/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const SwapUnitsAction = require('@duelyst/sdk/actions/swapUnitsAction');
const FXType = require('@duelyst/sdk/helpers/fxType');
const _ = require('underscore');

class SpellFollowupSwapPositions extends Spell {
  declare targetType: any;
  declare spellFilterType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellFollowupSwapPositions::onApplyEffectToBoardTile "
    const applyEffectPosition = { x, y };

    const source = board.getCardAtPosition(this.getFollowupSourcePosition(), this.targetType);
    const target = board.getCardAtPosition(applyEffectPosition, this.targetType);

    const swapAction = new SwapUnitsAction(this.getGameSession());
    swapAction.setOwnerId(this.getOwnerId());
    swapAction.setSource(source);
    swapAction.setTarget(target);
    swapAction.setFXResource(_.union(swapAction.getFXResource(), this.getFXResource()));
    return this.getGameSession().executeAction(swapAction);
  }
}
SpellFollowupSwapPositions.prototype.targetType = CardType.Unit;
SpellFollowupSwapPositions.prototype.spellFilterType = SpellFilterType.None;

module.exports = SpellFollowupSwapPositions;
