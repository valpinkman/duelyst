/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('@duelyst/sdk/actions/playCardAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const GameFormat = require('@duelyst/sdk/gameFormat');
const ModifierDeathWatch = require('./modifierDeathWatch');

class ModifierDeathWatchSpawnRandomDemon extends ModifierDeathWatch {
  declare type: any;
  declare possibleCardsToSpawn: any;
  declare spawnCount: any;
  declare spawnSilently: any;
  declare spawnPattern: any;
  declare fxResource: any;

  static type = 'ModifierDeathWatchSpawnRandomDemon';

  static createContextObject(
    possibleCardsToSpawn,
    spawnCount,
    spawnPattern,
    spawnSilently,
    options,
  ) {
    if (spawnCount == null) {
      spawnCount = 1;
    }
    if (spawnPattern == null) {
      spawnPattern = CONFIG.PATTERN_3x3;
    }
    if (spawnSilently == null) {
      spawnSilently = true;
    }
    const contextObject = super.createContextObject(options);
    contextObject.possibleCardsToSpawn = possibleCardsToSpawn;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  onDeathWatch(action) {
    super.onDeathWatch(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const ownerId = this.getSpawnOwnerId(action);
      const spawnPositions = UtilsGameSession.getRandomNonConflictingSmartSpawnPositionsForModifier(
        this,
        ModifierDeathWatchSpawnRandomDemon,
      );
      return (() => {
        const result = [];
        for (var spawnPosition of Array.from<any>(spawnPositions)) {
          var spawnAction;
          var cardDataOrIndexToSpawn = this.getCardDataOrIndexToSpawn();
          if (this.spawnSilently) {
            spawnAction = new PlayCardSilentlyAction(
              this.getGameSession(),
              ownerId,
              spawnPosition.x,
              spawnPosition.y,
              cardDataOrIndexToSpawn,
            );
          } else {
            spawnAction = new PlayCardAction(
              this.getGameSession(),
              ownerId,
              spawnPosition.x,
              spawnPosition.y,
              cardDataOrIndexToSpawn,
            );
          }
          spawnAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(spawnAction));
        }
        return result;
      })();
    }
  }

  getCardDataOrIndexToSpawn() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const possibleCardsToSpawn = [
        { id: Cards.Faction4.VorpalReaver },
        { id: Cards.Faction4.Moonrider },
        { id: Cards.Faction4.CreepDemon },
      ];
      if (this.getGameSession().getGameFormat() !== GameFormat.Standard) {
        possibleCardsToSpawn.push({ id: Cards.Faction4.Klaxon });
      }
      return possibleCardsToSpawn[
        this.getGameSession().getRandomIntegerForExecution(possibleCardsToSpawn.length)
      ];
    }
    return null;
  }

  getSpawnOwnerId(action) {
    return this.getCard().getOwnerId();
  }
}
ModifierDeathWatchSpawnRandomDemon.prototype.type = 'ModifierDeathWatchSpawnRandomDemon';
ModifierDeathWatchSpawnRandomDemon.prototype.possibleCardsToSpawn = null;
ModifierDeathWatchSpawnRandomDemon.prototype.spawnCount = 1;
ModifierDeathWatchSpawnRandomDemon.prototype.spawnSilently = true;
ModifierDeathWatchSpawnRandomDemon.prototype.spawnPattern = CONFIG.PATTERN_3x3;
ModifierDeathWatchSpawnRandomDemon.prototype.fxResource = [
  'FX.Modifiers.ModifierDeathWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierDeathWatchSpawnRandomDemon;
