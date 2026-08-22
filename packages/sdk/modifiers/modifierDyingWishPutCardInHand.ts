/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishPutCardInHand extends ModifierDyingWish {
  declare type: any;
  declare cardDataOrIndexToPutInHand: any;

  static type = 'ModifierDyingWishPutCardInHand';
  static description = 'Put %X in your Action Bar';

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

  onDyingWish() {
    const a = new PutCardInHandAction(
      this.getGameSession(),
      this.getCard().getOwnerId(),
      this.cardDataOrIndexToPutInHand,
    );
    return this.getGameSession().executeAction(a);
  }
}
ModifierDyingWishPutCardInHand.prototype.type = 'ModifierDyingWishPutCardInHand';
ModifierDyingWishPutCardInHand.prototype.cardDataOrIndexToPutInHand = null;

module.exports = ModifierDyingWishPutCardInHand;
