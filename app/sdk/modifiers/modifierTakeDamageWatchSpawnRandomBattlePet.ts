/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Factions = require('app/sdk/cards/factionsLookup');
const Races = require('app/sdk/cards/racesLookup');
const ModifierTakeDamageWatchSpawnEntity = require('./modifierTakeDamageWatchSpawnEntity');

class ModifierTakeDamageWatchSpawnRandomBattlePet extends ModifierTakeDamageWatchSpawnEntity {
  declare type: any;

  static type = 'ModifierTakeDamageWatchSpawnRandomBattlePet';
  static description = 'Whenever this minion takes damage, summon a random Battle Pet nearby';

  getCardDataOrIndexToSpawn() {
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
    return card.createNewCardData();
  }
}
ModifierTakeDamageWatchSpawnRandomBattlePet.prototype.type =
  'ModifierTakeDamageWatchSpawnRandomBattlePet';

module.exports = ModifierTakeDamageWatchSpawnRandomBattlePet;
