/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const RemoveAction = require('app/sdk/actions/removeAction');
const ModifierSurviveDamageWatch = require('./modifierSurviveDamageWatch');

class ModifierSurviveDamageWatchReturnToHand extends ModifierSurviveDamageWatch {
  static type = 'ModifierSurviveDamageWatchReturnToHand';
  static modifierName = '';
  static description = 'When this minion survives damage, it returns to your action bar';

  onSurviveDamage() {
    if (!this.hasTriggered) {
      this.hasTriggered = true;
      // remove unit from board
      const removeOriginalEntityAction = new RemoveAction(this.getGameSession());
      removeOriginalEntityAction.setOwnerId(this.getCard().getOwnerId());
      removeOriginalEntityAction.setTarget(this.getCard());
      this.getGameSession().executeAction(removeOriginalEntityAction);

      // put a fresh card matching the original unit into hand
      const putCardInHandAction = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), this.getCard().createNewCardData());
      return this.getGameSession().executeAction(putCardInHandAction);
    }
  }
}
ModifierSurviveDamageWatchReturnToHand.prototype.type = 'ModifierSurviveDamageWatchReturnToHand';
ModifierSurviveDamageWatchReturnToHand.prototype.hasTriggered = false;

module.exports = ModifierSurviveDamageWatchReturnToHand;
