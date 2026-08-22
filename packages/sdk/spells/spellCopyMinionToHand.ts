/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Spell = require('./spell');
const CardType = require('@duelyst/sdk/cards/cardType');
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');

class SpellCopyMinionToHand extends Spell {
  declare resetDamage: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    const entity = board.getCardAtPosition({ x, y }, CardType.Unit);
    const newCardData = entity.createCloneCardData();
    if (this.resetDamage) {
      newCardData.damage = 0;
    }

    const putCardInHandAction = new PutCardInHandAction(
      this.getGameSession(),
      entity.getOwnerId(),
      newCardData,
    );
    return this.getGameSession().executeAction(putCardInHandAction);
  }
}
SpellCopyMinionToHand.prototype.resetDamage = true;

module.exports = SpellCopyMinionToHand;
