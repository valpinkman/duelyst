/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const KillAction = require('@duelyst/sdk/actions/killAction');
const PlayerModifierManaModifierSingleUse = require('@duelyst/sdk/playerModifiers/playerModifierManaModifierSingleUse');

class SpellSoulclamp extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare canTargetGeneral: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);
    const applyEffectPosition = { x, y };
    const entity = board.getCardAtPosition(applyEffectPosition, this.targetType);

    // kill the target entity
    const killAction = new KillAction(this.getGameSession());
    killAction.setOwnerId(this.getOwnerId());
    killAction.setTarget(entity);
    this.getGameSession().executeAction(killAction);

    return true;
  }
}
SpellSoulclamp.prototype.targetType = CardType.Unit;
SpellSoulclamp.prototype.spellFilterType = SpellFilterType.AllyDirect;
SpellSoulclamp.prototype.canTargetGeneral = false;

module.exports = SpellSoulclamp;
