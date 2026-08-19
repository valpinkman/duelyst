/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Modifier = require('./modifier');

/*
  Base class for any modifier that will cause a unit to have custom spawn positions
  (other than Airdrop, as Airdrop is pre-defined)

*/
class ModifierCustomSpawn extends Modifier {
  static type = 'ModifierCustomSpawn';
  static modifierName = 'Custom Spawn';
  static description = '';

  getCustomSpawnPositions() {
    // return an array of valid spawn positions
    // override this is sub-class with actual spawn positions
    return [];
  }
}
ModifierCustomSpawn.prototype.type = 'ModifierCustomSpawn';
ModifierCustomSpawn.prototype.fxResource = ['FX.Modifiers.ModifierCustomSpawn'];

module.exports = ModifierCustomSpawn;
