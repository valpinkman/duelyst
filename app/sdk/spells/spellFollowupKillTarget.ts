/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const KillAction = require('app/sdk/actions/killAction');

class SpellFollowupKillTarget extends Spell {
  declare targetType: any;
  declare spellFilterType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const target = board.getCardAtPosition(applyEffectPosition, this.targetType);

    const killAction = new KillAction(this.getGameSession());
    killAction.setOwnerId(this.ownerId);
    killAction.setTarget(target);
    return this.getGameSession().executeAction(killAction);
  }
}
SpellFollowupKillTarget.prototype.targetType = CardType.Unit;
SpellFollowupKillTarget.prototype.spellFilterType = SpellFilterType.NeutralDirect;

module.exports = SpellFollowupKillTarget;
