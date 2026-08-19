/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsPosition = require('app/common/utils/utils_position');
const ModifierStartTurnWatchSpawnEntity = require('./modifierStartTurnWatchSpawnEntity');

class ModifierStartTurnWatchSpawnTile extends ModifierStartTurnWatchSpawnEntity {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierStartTurnWatchSpawnTile';
  static modifierName = 'Turn Watch';
  static description = 'At the start of your turn, turn %X';

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = '';
      if (UtilsPosition.getArraysOfPositionsAreEqual(modifierContextObject.spawnPattern, CONFIG.PATTERN_1x1)) {
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
ModifierStartTurnWatchSpawnTile.prototype.type = 'ModifierStartTurnWatchSpawnTile';
ModifierStartTurnWatchSpawnTile.prototype.fxResource = ['FX.Modifiers.ModifierStartTurnWatch', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierStartTurnWatchSpawnTile;
