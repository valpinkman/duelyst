/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierDyingWishSpawnEntity = require('./modifierDyingWishSpawnEntity');

class ModifierDyingWishSpawnRandomEntity extends ModifierDyingWishSpawnEntity {
  declare type: any;
  declare cardDataOrIndicesToSpawn: any;

  static type = 'ModifierDyingWishSpawnRandomEntity';

  static createContextObject(
    cardDataOrIndicesToSpawn,
    spawnDescription,
    spawnCount,
    spawnPattern,
    spawnSilently,
    options,
  ) {
    const contextObject = super.createContextObject(
      cardDataOrIndicesToSpawn[0],
      spawnDescription,
      spawnCount,
      spawnPattern,
      spawnSilently,
      options,
    );
    contextObject.cardDataOrIndicesToSpawn = cardDataOrIndicesToSpawn;
    return contextObject;
  }

  getCardDataOrIndexToSpawn() {
    return this.cardDataOrIndicesToSpawn[
      this.getGameSession().getRandomIntegerForExecution(this.cardDataOrIndicesToSpawn.length)
    ];
  }
}
ModifierDyingWishSpawnRandomEntity.prototype.type = 'ModifierDyingWishSpawnRandomEntity';
ModifierDyingWishSpawnRandomEntity.prototype.cardDataOrIndicesToSpawn = null;

module.exports = ModifierDyingWishSpawnRandomEntity;
