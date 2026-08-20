/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const Factions = require('app/sdk/cards/factionsLookup');
const Races = require('app/sdk/cards/racesLookup');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishDrawRandomBattlePet extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishDrawRandomBattlePet';
  static modifierName = 'Dying Wish';
  static description = 'Put a random Battle Pet into your action bar';

  onDyingWish() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const neutralBattlePetCards = this.getGameSession()
        .getCardCaches()
        .getFaction(Factions.Neutral)
        .getRace(Races.BattlePet)
        .getIsToken(true)
        .getIsPrismatic(false)
        .getIsSkinned(false)
        .getCards();
      const card =
        neutralBattlePetCards[
          this.getGameSession().getRandomIntegerForExecution(neutralBattlePetCards.length)
        ];
      const a = new PutCardInHandAction(
        this.getGameSession(),
        this.getCard().getOwnerId(),
        card.createNewCardData(),
      );
      return this.getGameSession().executeAction(a);
    }
  }
}
ModifierDyingWishDrawRandomBattlePet.prototype.type = 'ModifierDyingWishDrawRandomBattlePet';
ModifierDyingWishDrawRandomBattlePet.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish'];

module.exports = ModifierDyingWishDrawRandomBattlePet;
