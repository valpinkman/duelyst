/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellIntensify = require('./spellIntensify');
const HealAction = require('app/sdk/actions/healAction');

class SpellIntensifyHealMyGeneral extends SpellIntensify {
  declare healAmount: any;

  _findApplyEffectPositions(position, sourceAction) {
    return [this.getGameSession().getGeneralForPlayerId(this.getOwnerId()).getPosition()];
  }

  onApplyOneEffectToBoard(board, x, y, sourceAction) {
    super.onApplyOneEffectToBoard(board, x, y, sourceAction);

    const totalHealAmount = this.healAmount * this.getIntensifyAmount();

    const general = this.getGameSession().getGeneralForPlayerId(this.getOwnerId());
    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getOwnerId());
    healAction.setTarget(general);
    healAction.setHealAmount(totalHealAmount);
    return this.getGameSession().executeAction(healAction);
  }
}
SpellIntensifyHealMyGeneral.prototype.healAmount = 0;

module.exports = SpellIntensifyHealMyGeneral;
