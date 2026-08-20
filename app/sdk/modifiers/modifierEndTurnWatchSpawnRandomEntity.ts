/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierEndTurnWatchSpawnEntity = require('./modifierEndTurnWatchSpawnEntity');

class ModifierEndTurnWatchSpawnRandomEntity extends ModifierEndTurnWatchSpawnEntity {
  declare type: any;
  declare cardDataOrIndicesToSpawn: any;

  static type = 'ModifierEndTurnWatchSpawnRandomEntity';

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
ModifierEndTurnWatchSpawnRandomEntity.prototype.type = 'ModifierEndTurnWatchSpawnRandomEntity';
ModifierEndTurnWatchSpawnRandomEntity.prototype.cardDataOrIndicesToSpawn = null;

module.exports = ModifierEndTurnWatchSpawnRandomEntity;
