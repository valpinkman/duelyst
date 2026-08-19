/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierSummonWatchApplyModifiersToBoth = require('./modifierSummonWatchApplyModifiersToBoth');

class ModifierSummonWatchNearbyApplyModifiersToBoth extends ModifierSummonWatchApplyModifiersToBoth {
  static type = 'ModifierSummonWatchNearbyApplyModifiersToBoth';

  static createContextObject(modifiersContextObjects, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    return contextObject;
  }

  getIsValidBuffPosition(summonedUnitPosition) {
    const entityPosition = this.getCard().getPosition();
    if ((Math.abs(summonedUnitPosition.x - entityPosition.x) <= 1) && (Math.abs(summonedUnitPosition.y - entityPosition.y) <= 1)) {
      return true;
    }
    return false;
  }
}
ModifierSummonWatchNearbyApplyModifiersToBoth.prototype.type = 'ModifierSummonWatchNearbyApplyModifiersToBoth';
ModifierSummonWatchNearbyApplyModifiersToBoth.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierSummonWatchNearbyApplyModifiersToBoth;
