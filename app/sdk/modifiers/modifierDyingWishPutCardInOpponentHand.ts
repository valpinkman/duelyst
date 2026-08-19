/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishPutCardInOpponentHand extends ModifierDyingWish {
  declare type: any;
  declare cardDataOrIndexToPutInHand: any;

  static type = 'ModifierDyingWishPutCardInOpponentHand';

  static createContextObject(cardDataOrIndexToPutInHand, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToPutInHand = cardDataOrIndexToPutInHand;
    return contextObject;
  }

  onDyingWish() {
    const general = this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId()).getOwnerId();
    const a = new PutCardInHandAction(this.getGameSession(), general, this.cardDataOrIndexToPutInHand);
    return this.getGameSession().executeAction(a);
  }
}
ModifierDyingWishPutCardInOpponentHand.prototype.type = 'ModifierDyingWishPutCardInOpponentHand';
ModifierDyingWishPutCardInOpponentHand.prototype.cardDataOrIndexToPutInHand = null;

module.exports = ModifierDyingWishPutCardInOpponentHand;
