/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const HealAction = require('@duelyst/sdk/actions/healAction');

class SpellFollowupHeal extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare healAmount: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const target = board.getCardAtPosition(applyEffectPosition, this.targetType);
    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellFollowupHeal::onApplyEffectToBoardTile -> #{@healAmount} heal to #{target.getName()} at #{x}, #{y}"

    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.ownerId);
    healAction.setTarget(target);
    healAction.setHealAmount(this.healAmount);
    return this.getGameSession().executeAction(healAction);
  }
}
SpellFollowupHeal.prototype.targetType = CardType.Unit;
SpellFollowupHeal.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellFollowupHeal.prototype.healAmount = 0;

module.exports = SpellFollowupHeal;
