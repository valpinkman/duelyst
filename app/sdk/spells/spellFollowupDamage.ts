/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const DamageAction = require('app/sdk/actions/damageAction');

class SpellFollowupDamage extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare damageAmount: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const target = board.getCardAtPosition(applyEffectPosition, this.targetType);
    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellFollowupDamage::onApplyEffectToBoardTile -> #{@damageAmount} damage to #{target.getName()} at #{x}, #{y}"

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.ownerId);
    damageAction.setTarget(target);
    damageAction.setDamageAmount(this.damageAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
SpellFollowupDamage.prototype.targetType = CardType.Unit;
SpellFollowupDamage.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellFollowupDamage.prototype.damageAmount = 0;

module.exports = SpellFollowupDamage;
