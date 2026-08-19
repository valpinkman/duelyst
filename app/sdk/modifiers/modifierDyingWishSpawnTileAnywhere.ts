/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierDyingWishSpawnEntityAnywhere = require('./modifierDyingWishSpawnEntityAnywhere');

class ModifierDyingWishSpawnTileAnywhere extends ModifierDyingWishSpawnEntityAnywhere {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishSpawnTileAnywhere';
  static description = 'Turn %X';

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.spawnDescription);
    }
    return this.description;
  }
}
ModifierDyingWishSpawnTileAnywhere.prototype.type = 'ModifierDyingWishSpawnTileAnywhere';
ModifierDyingWishSpawnTileAnywhere.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierDyingWishSpawnTileAnywhere;
