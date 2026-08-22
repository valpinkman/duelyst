/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const KillAction = require('@duelyst/sdk/actions/killAction');
const PlayerModifierEndTurnRespawnEntityAnywhere = require('@duelyst/sdk/playerModifiers/playerModifierEndTurnRespawnEntityAnywhere');

class SpellDeathIncoming extends Spell {
  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);
    const target = board.getCardAtPosition({ x, y }, CardType.Unit);
    if (target != null) {
      if (!target.getIsGeneral()) {
        const respawnModifier = PlayerModifierEndTurnRespawnEntityAnywhere.createContextObject(
          target.createNewCardData(),
        );
        this.getGameSession().applyModifierContextObject(
          respawnModifier,
          this.getGameSession().getGeneralForPlayerId(this.getOwnerId()),
        );

        // then kill the target unit
        const killAction = new KillAction(this.getGameSession());
        killAction.setOwnerId(this.getOwnerId());
        killAction.setTarget(target);
        return this.getGameSession().executeAction(killAction);
      }
    }
  }
}

module.exports = SpellDeathIncoming;
