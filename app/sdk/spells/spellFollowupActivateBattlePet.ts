/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const PlayerModifierBattlePetManager = require('app/sdk/playerModifiers/playerModifierBattlePetManager');
const RefreshExhaustionAction = require('app/sdk/actions/refreshExhaustionAction');

class SpellFollowupActivateBattlePet extends Spell {
  declare targetType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const applyEffectPosition = { x, y };
      const target = board.getCardAtPosition(applyEffectPosition, this.targetType);
      if (target.getIsBattlePet()) {
        const general = this.getGameSession().getGeneralForPlayerId(target.getOwnerId());
        return general.getModifierByClass(PlayerModifierBattlePetManager).triggerBattlePet(target);
      }
      const refreshExhaustionAction = new RefreshExhaustionAction(this.getGameSession());
      refreshExhaustionAction.setTarget(target);
      return this.getGameSession().executeAction(refreshExhaustionAction);
    }
  }
}
SpellFollowupActivateBattlePet.prototype.targetType = CardType.Unit;

module.exports = SpellFollowupActivateBattlePet;
