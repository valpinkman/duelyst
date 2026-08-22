/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const ModifierCustomSpawn = require('./modifierCustomSpawn');

/*
  Base class for any modifier that will cause a unit to have custom spawn positions
  (other than Airdrop, as Airdrop is pre-defined)

*/
class ModifierCustomSpawnOnOtherUnit extends ModifierCustomSpawn {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierCustomSpawnOnOtherUnit';
  static modifierName = 'Custom Spawn';
  static description = '';

  getCustomSpawnPositions() {
    const validSpawnLocations = [];
    const board = this.getGameSession().getBoard();
    for (var entity of Array.from<any>(board.getEntities())) {
      if (entity.getType() === CardType.Unit && !entity.getIsGeneral()) {
        validSpawnLocations.push(entity.getPosition());
      }
    }
    return validSpawnLocations;
  }
}
ModifierCustomSpawnOnOtherUnit.prototype.type = 'ModifierCustomSpawnOnOtherUnit';
ModifierCustomSpawnOnOtherUnit.prototype.fxResource = ['FX.Modifiers.ModifierCustomSpawn'];

module.exports = ModifierCustomSpawnOnOtherUnit;
