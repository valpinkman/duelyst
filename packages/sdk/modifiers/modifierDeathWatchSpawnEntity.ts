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
const ModifierDeathWatch = require('./modifierDeathWatch');

class ModifierDeathWatchSpawnEntity extends ModifierDeathWatch {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare spawnCount: any;
  declare spawnSilently: any;
  declare spawnPattern: any;
  declare fxResource: any;

  static type = 'ModifierDeathWatchSpawnEntity';
  static modifierName = 'Deathwatch';
  static description = 'Summon a %X on a random nearby space';

  static createContextObject(
    cardDataOrIndexToSpawn,
    spawnDescription,
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
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnDescription = spawnDescription;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.spawnDescription);
    }
    return this.description;
  }

  onDeathWatch(action) {
    super.onDeathWatch(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const ownerId = this.getSpawnOwnerId(action);
      const spawnPositions = UtilsGameSession.getRandomNonConflictingSmartSpawnPositionsForModifier(
        this,
        ModifierDeathWatchSpawnEntity,
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
    return this.cardDataOrIndexToSpawn;
  }

  getSpawnOwnerId(action) {
    return this.getCard().getOwnerId();
  }
}
ModifierDeathWatchSpawnEntity.prototype.type = 'ModifierDeathWatchSpawnEntity';
ModifierDeathWatchSpawnEntity.prototype.cardDataOrIndexToSpawn = null;
ModifierDeathWatchSpawnEntity.prototype.spawnCount = 1;
ModifierDeathWatchSpawnEntity.prototype.spawnSilently = true;
ModifierDeathWatchSpawnEntity.prototype.spawnPattern = CONFIG.PATTERN_3x3;
ModifierDeathWatchSpawnEntity.prototype.fxResource = [
  'FX.Modifiers.ModifierDeathWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierDeathWatchSpawnEntity;
