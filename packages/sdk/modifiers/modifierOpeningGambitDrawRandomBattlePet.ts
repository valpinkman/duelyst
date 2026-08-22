/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('@duelyst/sdk/actions/putCardInHandAction');
const Factions = require('@duelyst/sdk/cards/factionsLookup');
const Races = require('@duelyst/sdk/cards/racesLookup');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDrawRandomBattlePet extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDrawRandomBattlePet';
  static modifierName = 'Opening Gambit';
  static description = 'Put a random Battle Pet into your action bar';

  onOpeningGambit() {
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
ModifierOpeningGambitDrawRandomBattlePet.prototype.type =
  'ModifierOpeningGambitDrawRandomBattlePet';
ModifierOpeningGambitDrawRandomBattlePet.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
];

module.exports = ModifierOpeningGambitDrawRandomBattlePet;
