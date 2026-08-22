/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellIntensify = require('./spellIntensify');
const CardType = require('@duelyst/sdk/cards/cardType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');

class SpellIntensifyDealDamage extends SpellIntensify {
  declare damageAmount: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const target = board.getCardAtPosition({ x, y }, CardType.Unit);

    const totalDamageAmount = this.damageAmount * this.getIntensifyAmount();

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.ownerId);
    damageAction.setTarget(target);
    damageAction.setDamageAmount(totalDamageAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
SpellIntensifyDealDamage.prototype.damageAmount = 0;

module.exports = SpellIntensifyDealDamage;
