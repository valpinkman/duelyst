/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishDrawWishCard extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishDrawWishCard';
  static description = 'Put a random Wish card into your action bar';

  onDyingWish() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const wishCards = [
        { id: Cards.Spell.ScionsFirstWish },
        { id: Cards.Spell.ScionsSecondWish },
        { id: Cards.Spell.ScionsThirdWish },
      ];
      const wishCard =
        wishCards[this.getGameSession().getRandomIntegerForExecution(wishCards.length)];
      const a = new PutCardInHandAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        wishCard,
      );
      return this.getGameSession().executeAction(a);
    }
  }
}
ModifierDyingWishDrawWishCard.prototype.type = 'ModifierDyingWishDrawWishCard';
ModifierDyingWishDrawWishCard.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierDyingWishDrawWishCard;
