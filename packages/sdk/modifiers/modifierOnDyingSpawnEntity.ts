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
const UtilsPosition = require('@duelyst/common/utils/utils_position');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('@duelyst/sdk/actions/playCardAction');
const ModifierOnDying = require('./modifierOnDying');
const ModifierDyingWishSpawnEntity = require('./modifierDyingWishSpawnEntity');

class ModifierOnDyingSpawnEntity extends ModifierOnDying {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare spawnCount: any;
  declare spawnPattern: any;
  declare spawnSilently: any;
  declare fxResource: any;

  static type = 'ModifierOnDyingSpawnEntity';

  static createContextObject(
    cardDataOrIndexToSpawn,
    spawnCount,
    spawnPattern,
    spawnSilently,
    options,
  ) {
    if (spawnCount == null) {
      spawnCount = 1;
    }
    if (spawnPattern == null) {
      spawnPattern = CONFIG.PATTERN_1x1;
    }
    if (spawnSilently == null) {
      spawnSilently = true;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  onDying(action) {
    super.onDying(action);

    if (
      this.getGameSession().getIsRunningAsAuthoritative() &&
      this.getCardDataOrIndexToSpawn() != null
    ) {
      const ownerId = this.getSpawnOwnerId(action);
      const spawnPositions = UtilsGameSession.getRandomNonConflictingSmartSpawnPositionsForModifier(
        this,
        ModifierDyingWishSpawnEntity,
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
ModifierOnDyingSpawnEntity.prototype.type = 'ModifierOnDyingSpawnEntity';
ModifierOnDyingSpawnEntity.prototype.cardDataOrIndexToSpawn = null;
ModifierOnDyingSpawnEntity.prototype.spawnCount = null;
ModifierOnDyingSpawnEntity.prototype.spawnPattern = null;
ModifierOnDyingSpawnEntity.prototype.spawnSilently = true;
ModifierOnDyingSpawnEntity.prototype.fxResource = ['FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierOnDyingSpawnEntity;
