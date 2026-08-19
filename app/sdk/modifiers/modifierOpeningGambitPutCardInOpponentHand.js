/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitPutCardInOpponentHand extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitPutCardInOpponentHand';
  static description = 'Put %X in your opponent\'s action bar';

  static createContextObject(cardDataOrIndexToPutInHand, cardDescription, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToPutInHand = cardDataOrIndexToPutInHand;
    contextObject.cardDescription = cardDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.cardDescription);
    }
    return this.description;
  }

  onOpeningGambit(action) {
    super.onOpeningGambit(action);
    const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()), this.cardDataOrIndexToPutInHand);
    return this.getGameSession().executeAction(a);
  }
}
ModifierOpeningGambitPutCardInOpponentHand.prototype.type = 'ModifierOpeningGambitPutCardInOpponentHand';

module.exports = ModifierOpeningGambitPutCardInOpponentHand;
