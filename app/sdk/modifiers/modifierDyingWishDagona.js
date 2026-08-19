/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierDyingWishSpawnEntity = require('./modifierDyingWishSpawnEntity');

class ModifierDyingWishDagona extends ModifierDyingWishSpawnEntity {
  static type = 'ModifierDyingWishDagona';

  createContextObjectForClone(contextObject) {
    const cloneContextObject = super.createContextObjectForClone(contextObject);
    cloneContextObject.spawnOwnerId = this.spawnOwnerId;
    cloneContextObject.cardDataOrIndexToSpawn = this.cardDataOrIndexToSpawn;
    return cloneContextObject;
  }

  setCardDataOrIndexToSpawn(cardDataOrIndexToSpawn) {
    return this.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
  }

  setSpawnOwnerId(ownerId) {
    return this.spawnOwnerId = ownerId;
  }

  getSpawnOwnerId(action) {
    if (this.spawnOwnerId != null) {
      return this.spawnOwnerId;
    }
    return super.getSpawnOwnerId(action);
  }
}
ModifierDyingWishDagona.prototype.type = 'ModifierDyingWishDagona';
ModifierDyingWishDagona.prototype.spawnOwnerId = null;

module.exports = ModifierDyingWishDagona;
