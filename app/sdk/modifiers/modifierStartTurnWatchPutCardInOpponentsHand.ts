/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchPutCardInOpponentsHand extends ModifierStartTurnWatch {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;

  static type = 'ModifierStartTurnWatchPutCardInOpponentsHand';
  static description = "Add a card to your opponent's hand at start of turn";

  static createContextObject(cardDataOrIndexToSpawn, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    return contextObject;
  }

  onTurnWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.cardDataOrIndexToSpawn,
      );
      const general = this.getGameSession()
        .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId())
        .getOwnerId();
      const putCardInHandAction = new PutCardInHandAction(this.getGameSession(), general, card);
      return this.getGameSession().executeAction(putCardInHandAction);
    }
  }
}
ModifierStartTurnWatchPutCardInOpponentsHand.prototype.type =
  'ModifierStartTurnWatchPutCardInOpponentsHand';
ModifierStartTurnWatchPutCardInOpponentsHand.prototype.cardDataOrIndexToSpawn = null;

module.exports = ModifierStartTurnWatchPutCardInOpponentsHand;
