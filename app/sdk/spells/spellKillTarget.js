/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const KillAction = require('app/sdk/actions/killAction');

class SpellKillTarget extends Spell {
  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const target = board.getCardAtPosition({ x, y }, this.targetType);
    if (target != null) {
      // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "SpellKillTarget::onApplyEffectToBoardTile -> kill #{target.getName()} at #{x}, #{y}"

      const killAction = new KillAction(this.getGameSession());
      killAction.setOwnerId(this.getOwnerId());
      killAction.setTarget(target);
      return this.getGameSession().executeAction(killAction);
    }
  }
}
SpellKillTarget.prototype.targetType = CardType.Unit;
SpellKillTarget.prototype.spellFilterType = SpellFilterType.NeutralDirect;

module.exports = SpellKillTarget;
