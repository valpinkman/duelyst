/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');
const RestoreManaAction = require('@duelyst/sdk/actions/restoreManaAction');

class SpellRestoreMana extends Spell {
  declare restoreManaAmount: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const restoreManaAction = new RestoreManaAction(this.getGameSession());
    restoreManaAction.setManaAmount(this.restoreManaAmount);
    return this.getGameSession().executeAction(restoreManaAction);
  }
}
SpellRestoreMana.prototype.restoreManaAmount = 0;

module.exports = SpellRestoreMana;
