/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const HealAction = require('@duelyst/sdk/actions/healAction');

class SpellDamageOrHeal extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare damageOrHealAmount: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const target = board.getCardAtPosition({ x, y }, this.targetType);

    if (target.getOwnerId() === this.getOwnerId()) {
      const healAction = new HealAction(this.getGameSession());
      healAction.setOwnerId(this.ownerId);
      healAction.setTarget(target);
      healAction.setHealAmount(this.damageOrHealAmount);
      return this.getGameSession().executeAction(healAction);
    }
    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.ownerId);
    damageAction.setTarget(target);
    damageAction.setDamageAmount(this.damageOrHealAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
SpellDamageOrHeal.prototype.targetType = CardType.Unit;
SpellDamageOrHeal.prototype.spellFilterType = SpellFilterType.NeutralDirect;
SpellDamageOrHeal.prototype.damageOrHealAmount = 2;

module.exports = SpellDamageOrHeal;
