/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Cards = require('app/sdk/cards/cardsLookupComplete');
const ModifierTakeDamageWatchSpawnEntity = require('./modifierTakeDamageWatchSpawnEntity');

class ModifierTakeDamageWatchSpawnRandomHaunt extends ModifierTakeDamageWatchSpawnEntity {
  static type = 'ModifierTakeDamageWatchSpawnRandomHaunt';
  static description = 'Whenever this minion takes damage, summon a random haunt nearby';

  getCardDataOrIndexToSpawn() {
    return this.possibleTokens[this.getGameSession().getRandomIntegerForExecution(this.possibleTokens.length)];
  }
}
ModifierTakeDamageWatchSpawnRandomHaunt.prototype.type = 'ModifierTakeDamageWatchSpawnRandomHaunt';
ModifierTakeDamageWatchSpawnRandomHaunt.prototype.possibleTokens = [
  { id: Cards.Boss.Boss31Haunt1 },
  { id: Cards.Boss.Boss31Haunt2 },
  { id: Cards.Boss.Boss31Haunt3 },
];

module.exports = ModifierTakeDamageWatchSpawnRandomHaunt;
