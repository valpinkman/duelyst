/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('app/common/utils/utils_game_session');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const ModifierSummonWatchAnyPlayerApplyModifiers = require('./modifierSummonWatchAnyPlayerApplyModifiers');

class ModifierSummonWatchNearbyAnyPlayerApplyModifiers extends ModifierSummonWatchAnyPlayerApplyModifiers {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchNearbyAnyPlayerApplyModifiers';
  static description = 'ANY minion summoned nearby this minion %X';

  static createContextObject(modifiersContextObjects, buffDescription, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.buffDescription = buffDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.buffDescription);
    }
    return this.description;
  }

  getIsValidBuffPosition(summonedUnitPosition) {
    const entityPosition = this.getCard().getPosition();
    if ((Math.abs(summonedUnitPosition.x - entityPosition.x) <= 1) && (Math.abs(summonedUnitPosition.y - entityPosition.y) <= 1)) {
      return true;
    }
    return false;
  }
}
ModifierSummonWatchNearbyAnyPlayerApplyModifiers.prototype.type = 'ModifierSummonWatchNearbyAnyPlayerApplyModifiers';
ModifierSummonWatchNearbyAnyPlayerApplyModifiers.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierSummonWatchNearbyAnyPlayerApplyModifiers;
