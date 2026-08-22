/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsPosition = require('app/common/utils/utils_position');
const ModifierEndTurnWatchSpawnEntity = require('./modifierEndTurnWatchSpawnEntity');

class ModifierEndTurnWatchSpawnTile extends ModifierEndTurnWatchSpawnEntity {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierEndTurnWatchSpawnTile';
  static modifierName = 'Turn Watch';
  static description = 'At the end of your turn, turn %X';

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = '';
      if (
        UtilsPosition.getArraysOfPositionsAreEqual(
          modifierContextObject.spawnPattern,
          CONFIG.PATTERN_1x1,
        )
      ) {
        replaceText = `its space into ${modifierContextObject.spawnDescription}`;
      } else if (modifierContextObject.spawnCount === 1) {
        replaceText = `a nearby space into ${modifierContextObject.spawnDescription}`;
      } else if (modifierContextObject.spawnCount === 8) {
        replaceText = `all nearby spaces into ${modifierContextObject.spawnDescription}`;
      } else {
        replaceText = `${modifierContextObject.spawnCount} nearby spaces into ${modifierContextObject.spawnDescription}`;
      }
      return this.description.replace(/%X/, replaceText);
    }
    return this.description;
  }
}
ModifierEndTurnWatchSpawnTile.prototype.type = 'ModifierEndTurnWatchSpawnTile';
ModifierEndTurnWatchSpawnTile.prototype.fxResource = [
  'FX.Modifiers.ModifierEndTurnWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierEndTurnWatchSpawnTile;
