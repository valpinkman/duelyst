/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveAction = require('app/sdk/actions/removeAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');
const ModifierDyingWishDagona = require('./modifierDyingWishDagona');

class ModifierOpeningGambitDagona extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitDagona';

  onOpeningGambit() {
    // consume original unit at spawn position (remove it from board)
    if (!(this.getGameSession().getBoard().getCardAtPosition(this.getCard().getPosition()) === this.getCard())) {
      const originalCardAtPosition = this.getGameSession().getBoard().getCardAtPosition(this.getCard().getPosition());
      const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
      removeOriginalEntityAction.setOwnerId(this.getOwnerId());
      removeOriginalEntityAction.setTarget(originalCardAtPosition);

      // store data of the consumed unit
      if (this.getCard().hasModifierClass(ModifierDyingWishDagona)) {
        const dyingWishModifier = this.getCard().getModifiersByClass(ModifierDyingWishDagona)[0];
        dyingWishModifier.setCardDataOrIndexToSpawn(originalCardAtPosition.createNewCardData());
        dyingWishModifier.setSpawnOwnerId(originalCardAtPosition.getOwnerId());
      }

      // execute remove original unit from board
      return this.getGameSession().executeAction(removeOriginalEntityAction);
    }
  }
}
ModifierOpeningGambitDagona.prototype.type = 'ModifierOpeningGambitDagona';

module.exports = ModifierOpeningGambitDagona;
