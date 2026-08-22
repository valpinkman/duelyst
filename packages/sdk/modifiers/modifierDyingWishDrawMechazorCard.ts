/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const Races = require('@duelyst/sdk/cards/racesLookup');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishDrawMechazorCard extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishDrawMechazorCard';
  static description = 'Put a random MECH minion into your action bar';

  onDyingWish() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const mechCards = this.getGameSession()
        .getCardCaches()
        .getRace(Races.Mech)
        .getIsPrismatic(false)
        .getIsSkinned(false)
        .getCards();
      const mechCard =
        mechCards[this.getGameSession().getRandomIntegerForExecution(mechCards.length)];
      const a = new PutCardInHandAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        mechCard.createNewCardData(),
      );
      return this.getGameSession().executeAction(a);
    }
  }
}
ModifierDyingWishDrawMechazorCard.prototype.type = 'ModifierDyingWishDrawMechazorCard';
ModifierDyingWishDrawMechazorCard.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierDyingWishDrawMechazorCard;
