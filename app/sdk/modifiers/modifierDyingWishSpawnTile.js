/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsPosition = require('app/common/utils/utils_position');
const ModifierDyingWishSpawnEntity = require('./modifierDyingWishSpawnEntity');

class ModifierDyingWishSpawnTile extends ModifierDyingWishSpawnEntity {
  static type = 'ModifierDyingWishSpawnTile';
  static description = 'Turn %X';

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = '';
      if (UtilsPosition.getArraysOfPositionsAreEqual(modifierContextObject.spawnPattern, CONFIG.PATTERN_1x1)) {
        replaceText = `this space into ${modifierContextObject.spawnDescription}`;
      } else if (modifierContextObject.spawnCount === 1) {
        replaceText = `a ${modifierContextObject.spawnDescription} in a random nearby space`;
      } else if (modifierContextObject.spawnCount === 8) {
        replaceText = `${modifierContextObject.spawnDescription}s in all nearby spaces`;
      } else {
        replaceText = `${modifierContextObject.spawnDescription}s into ${modifierContextObject.spawnCount} nearby spaces`;
      }
      return this.description.replace(/%X/, replaceText);
    }
    return this.description;
  }
}
ModifierDyingWishSpawnTile.prototype.type = 'ModifierDyingWishSpawnTile';
ModifierDyingWishSpawnTile.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierDyingWishSpawnTile;
