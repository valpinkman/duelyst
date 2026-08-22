/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('@duelyst/common/logger');
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const RemoveArtifactsAction = require('@duelyst/sdk/actions/removeArtifactsAction');

class SpellRemoveArtifacts extends Spell {
  declare targetType: any;
  declare spellFilterType: any;
  declare canTargetGeneral: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const target = board.getCardAtPosition(applyEffectPosition, this.targetType);

    // Logger.module("SDK").debug "[G:#{@.getGameSession().gameId}]", "RemoveArtifactsAction::onApplyEffectToBoardTile"
    const removeArtifactsAction = new RemoveArtifactsAction(this.getGameSession());
    removeArtifactsAction.setTarget(target);
    return this.getGameSession().executeAction(removeArtifactsAction);
  }

  _findApplyEffectPositions(position, sourceAction) {
    const applyEffectPositions = [];

    // can only target enemy general
    const general = this.getGameSession().getGeneralForOpponentOfPlayerId(this.getOwnerId());
    if (general != null) {
      applyEffectPositions.push(general.getPosition());
    }

    return applyEffectPositions;
  }
}
SpellRemoveArtifacts.prototype.targetType = CardType.Unit;
SpellRemoveArtifacts.prototype.spellFilterType = SpellFilterType.EnemyIndirect;
SpellRemoveArtifacts.prototype.canTargetGeneral = true;

module.exports = SpellRemoveArtifacts;
