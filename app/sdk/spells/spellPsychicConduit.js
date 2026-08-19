/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const SpellApplyModifiers = require('./spellApplyModifiers');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const SwapUnitAllegianceAction = require('app/sdk/actions/swapUnitAllegianceAction');
const RefreshExhaustionAction = require('app/sdk/actions/refreshExhaustionAction');

class SpellPsychicConduit extends SpellApplyModifiers {
  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const applyEffectPosition = { x, y };
    const entity = board.getCardAtPosition(applyEffectPosition, this.targetType);
    const a = new SwapUnitAllegianceAction(this.getGameSession());
    a.setTarget(entity);
    this.getGameSession().executeAction(a);

    // activate immediately
    const refreshExhaustionAction = new RefreshExhaustionAction(this.getGameSession());
    refreshExhaustionAction.setTarget(entity);
    return this.getGameSession().executeAction(refreshExhaustionAction);
  }

  _postFilterPlayPositions(validPositions) {
    const validTargetPositions = [];

    if (this.maxAttack >= 0) { // if maxAttack < 0, then any enemy unit is a valid target
      for (var position of Array.from(validPositions)) {
        var unit = this.getGameSession().getBoard().getUnitAtPosition(position);
        if ((unit != null) && (unit.getATK() <= this.maxAttack)) {
          validTargetPositions.push(position);
        }
      }
    }

    return validTargetPositions;
  }
}
SpellPsychicConduit.prototype.targetType = CardType.Unit;
SpellPsychicConduit.prototype.spellFilterType = SpellFilterType.EnemyDirect;
SpellPsychicConduit.prototype.maxAttack = -1;

module.exports = SpellPsychicConduit;
