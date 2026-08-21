/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const UtilsPosition = require('app/common/utils/utils_position');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishSpawnEntity extends ModifierDyingWish {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare spawnDescription: any;
  declare spawnCount: any;
  declare spawnPattern: any;
  declare spawnSilently: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishSpawnEntity';
  static modifierName = 'Dying Wish';
  static description = 'Summon %X';

  static createContextObject(
    cardDataOrIndexToSpawn,
    spawnDescription,
    spawnCount,
    spawnPattern,
    spawnSilently,
    options,
  ) {
    if (spawnDescription == null) {
      spawnDescription = '';
    }
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
    contextObject.spawnDescription = spawnDescription;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = '';
      if (
        UtilsPosition.getArraysOfPositionsAreEqual(
          modifierContextObject.spawnPattern,
          CONFIG.PATTERN_1x1,
        )
      ) {
        replaceText = `a ${modifierContextObject.spawnDescription} on this space`;
      } else if (modifierContextObject.spawnCount === 1) {
        replaceText = `a ${modifierContextObject.spawnDescription} in a random nearby space`;
      } else if (modifierContextObject.spawnCount === 8) {
        replaceText = `${modifierContextObject.spawnDescription}s in all nearby spaces`;
      } else {
        replaceText = `${modifierContextObject.spawnDescription} nearby`;
      }
      return this.description.replace(/%X/, replaceText);
    }
    return this.description;
  }

  onDyingWish(action) {
    super.onDyingWish(action);

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
ModifierDyingWishSpawnEntity.prototype.type = 'ModifierDyingWishSpawnEntity';
ModifierDyingWishSpawnEntity.prototype.cardDataOrIndexToSpawn = null;
ModifierDyingWishSpawnEntity.prototype.spawnDescription = null;
ModifierDyingWishSpawnEntity.prototype.spawnCount = null;
ModifierDyingWishSpawnEntity.prototype.spawnPattern = null;
ModifierDyingWishSpawnEntity.prototype.spawnSilently = true;
ModifierDyingWishSpawnEntity.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierDyingWishSpawnEntity;
