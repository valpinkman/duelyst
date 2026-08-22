/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInDeckAction = require('@duelyst/sdk/actions/putCardInDeckAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishAddCardToDeck extends ModifierDyingWish {
  declare type: any;
  declare cardData: any;

  static type = 'ModifierDyingWishAddCardToDeck';

  static createContextObject(cardData, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardData = cardData;
    return contextObject;
  }

  onDyingWish() {
    if (this.cardData != null) {
      this.cardData.ownerId = this.getOwnerId();
      const putCardInDeckAction = new PutCardInDeckAction(
        this.getGameSession(),
        this.getOwnerId(),
        this.cardData,
      );
      return this.getGameSession().executeAction(putCardInDeckAction);
    }
  }
}
ModifierDyingWishAddCardToDeck.prototype.type = 'ModifierDyingWishAddCardToDeck';
ModifierDyingWishAddCardToDeck.prototype.cardData = null;

module.exports = ModifierDyingWishAddCardToDeck;
