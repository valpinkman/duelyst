/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierSummonWatchTransform = require('./modifierSummonWatchTransform');

class ModifierSummonWatchNearbyTransform extends ModifierSummonWatchTransform {
  static type = 'ModifierSummonWatchNearbyTransform';

  getIsValidTransformPosition(summonedUnitPosition) {
    const entityPosition = this.getCard().getPosition();
    if ((Math.abs(summonedUnitPosition.x - entityPosition.x) <= 1) && (Math.abs(summonedUnitPosition.y - entityPosition.y) <= 1)) {
      return true;
    }
    return false;
  }
}
ModifierSummonWatchNearbyTransform.prototype.type = 'ModifierSummonWatchNearbyTransform';
ModifierSummonWatchNearbyTransform.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch'];

module.exports = ModifierSummonWatchNearbyTransform;
