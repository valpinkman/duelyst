/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const ModifierEgg = require('app/sdk/modifiers/modifierEgg');
const ModifierOpponentSummonWatch = require('./modifierOpponentSummonWatch');

class ModifierOpponentSummonWatchSummonEgg extends ModifierOpponentSummonWatch {
  declare type: any;
  declare fxResource: any;
  declare cardDataOrIndexToSpawn: any;
  declare eggName: any;

  static type = 'ModifierOpponentSummonWatchSummonEgg';
  static modifierName = 'Opponent Summon Watch Summon Egg';
  static description = 'Whenever your opponent summons a minion, summon an egg.';

  static createContextObject(cardDataOrIndexToSpawn, eggName, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.eggName = eggName;
    return contextObject;
  }

  onSummonWatch(action) {
    super.onSummonWatch(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(this.getGameSession(), this.getCard().getPosition(), CONFIG.PATTERN_3x3, this.getCard());
      if (validSpawnLocations.length > 0) {
        const spawnLocation = validSpawnLocations.splice(this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length), 1)[0];
        const eggToSpawn = { id: Cards.Faction5.Egg };
        // add modifiers to card data
        if (eggToSpawn.additionalInherentModifiersContextObjects == null) { eggToSpawn.additionalInherentModifiersContextObjects = []; }
        eggToSpawn.additionalInherentModifiersContextObjects.push(ModifierEgg.createContextObject(this.cardDataOrIndexToSpawn, this.eggName));
        const spawnAction = new PlayCardSilentlyAction(this.getGameSession(), this.getCard().getOwnerId(), spawnLocation.x, spawnLocation.y, eggToSpawn);
        spawnAction.setSource(this.getCard());
        return this.getGameSession().executeAction(spawnAction);
      }
    }
  }
}
ModifierOpponentSummonWatchSummonEgg.prototype.type = 'ModifierOpponentSummonWatchSummonEgg';
ModifierOpponentSummonWatchSummonEgg.prototype.fxResource = ['FX.Modifiers.ModifierOpponentSummonWatch'];
ModifierOpponentSummonWatchSummonEgg.prototype.cardDataOrIndexToSpawn = null;
ModifierOpponentSummonWatchSummonEgg.prototype.eggName = null;

module.exports = ModifierOpponentSummonWatchSummonEgg;
