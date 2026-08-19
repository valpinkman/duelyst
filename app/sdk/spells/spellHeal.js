/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const HealAction = require('app/sdk/actions/healAction');

class SpellHeal extends Spell {
  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const entity = board.getCardAtPosition(applyEffectPosition, this.targetType);
    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellHeal::onApplyEffectToBoardTile -> healing #{entity.getLogName()} by #{@healModifier}"

    const healAction = new HealAction(this.getGameSession());
    healAction.manaCost = 0;
    healAction.setOwnerId(this.ownerId);
    healAction.setTarget(entity);
    healAction.setHealAmount(this.healModifier);

    return this.getGameSession().executeAction(healAction);
  }
}
SpellHeal.prototype.targetType = CardType.Unit;
SpellHeal.prototype.spellFilterType = SpellFilterType.AllyDirect;
SpellHeal.prototype.healModifier = 0;

module.exports = SpellHeal;
