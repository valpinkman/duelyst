/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const KillAction = require('app/sdk/actions/killAction');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchPutCardInHand extends ModifierStartTurnWatch {
  declare type: any;
  declare cardData: any;

  static type = 'ModifierStartTurnWatchPutCardInHand';
  static description = 'Add a card to your hand at start of turn';

  static createContextObject(cardData, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardData = cardData;
    return contextObject;
  }

  onTurnWatch(action) {
    const putCardInHandAction = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), this.cardData);
    return this.getGameSession().executeAction(putCardInHandAction);
  }
}
ModifierStartTurnWatchPutCardInHand.prototype.type = 'ModifierStartTurnWatchPutCardInHand';
ModifierStartTurnWatchPutCardInHand.prototype.cardData = null;

module.exports = ModifierStartTurnWatchPutCardInHand;
