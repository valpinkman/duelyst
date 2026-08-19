/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitPutCardInHand extends ModifierOpeningGambit {
  declare type: any;
  declare cardDataOrIndexToPutInHand: any;

  static type = 'ModifierOpeningGambitPutCardInHand';

  static createContextObject(cardDataOrIndexToPutInHand, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToPutInHand = cardDataOrIndexToPutInHand;
    return contextObject;
  }

  onOpeningGambit(action) {
    super.onOpeningGambit(action);
    const a = new PutCardInHandAction(this.getGameSession(), this.getCard().getOwnerId(), this.cardDataOrIndexToPutInHand);
    return this.getGameSession().executeAction(a);
  }
}
ModifierOpeningGambitPutCardInHand.prototype.type = 'ModifierOpeningGambitPutCardInHand';
ModifierOpeningGambitPutCardInHand.prototype.cardDataOrIndexToPutInHand = null;

module.exports = ModifierOpeningGambitPutCardInHand;
