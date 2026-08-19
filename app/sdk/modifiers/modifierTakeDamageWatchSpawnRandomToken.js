/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierTakeDamageWatchSpawnEntity = require('./modifierTakeDamageWatchSpawnEntity');

class ModifierTakeDamageWatchSpawnRandomToken extends ModifierTakeDamageWatchSpawnEntity {
  static type = 'ModifierTakeDamageWatchSpawnRandomToken';
  static description = 'Whenever this minion takes damage, summon a random token minion nearby';

  getCardDataOrIndexToSpawn() {
    return this.possibleTokens[this.getGameSession().getRandomIntegerForExecution(this.possibleTokens.length)];
  }
}
ModifierTakeDamageWatchSpawnRandomToken.prototype.type = 'ModifierTakeDamageWatchSpawnRandomToken';
ModifierTakeDamageWatchSpawnRandomToken.prototype.possibleTokens = [
  { id: Cards.Faction5.MiniMagmar },
  { id: Cards.Neutral.MiniJax },
  { id: Cards.Faction6.Treant },
  { id: Cards.Faction6.GhostWolf },
  { id: Cards.Faction6.AzureDrake }, // whyte wyvern
  { id: Cards.Neutral.ArcaneIllusion },
  { id: Cards.Faction6.WaterBear }, // winter maerid
  { id: Cards.Faction4.Wraithling },
  { id: Cards.Faction2.OnyxBear }, // panddo
  { id: Cards.Neutral.Mechaz0r },
  { id: Cards.Faction6.SeismicElemental },
  { id: Cards.Faction6.IceDrake },
  { id: Cards.Neutral.Spellspark },
];

module.exports = ModifierTakeDamageWatchSpawnRandomToken;
