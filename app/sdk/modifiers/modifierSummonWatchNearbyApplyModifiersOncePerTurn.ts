/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const ModifierSummonWatchNearbyApplyModifiers = require('./modifierSummonWatchApplyModifiers');

class ModifierSummonWatchNearbyApplyModifiersOncePerTurn extends ModifierSummonWatchNearbyApplyModifiers {
  declare type: any;
  declare canApplyModifier: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchNearbyApplyModifiersOncePerTurn';
  static description = 'The first friendly minion summoned nearby this minion each turn %X';

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
    if (this.canApplyModifier) {
      const entityPosition = this.getCard().getPosition();
      if (
        Math.abs(summonedUnitPosition.x - entityPosition.x) <= 1 &&
        Math.abs(summonedUnitPosition.y - entityPosition.y) <= 1
      ) {
        this.canApplyModifier = false;
        return true;
      }
      return false;
    }
    return false;
  }

  onStartTurn(actionEvent) {
    super.onStartTurn(actionEvent);
    return (this.canApplyModifier = true);
  }
}
ModifierSummonWatchNearbyApplyModifiersOncePerTurn.prototype.type =
  'ModifierSummonWatchNearbyApplyModifiersOncePerTurn';
ModifierSummonWatchNearbyApplyModifiersOncePerTurn.prototype.canApplyModifier = true;
ModifierSummonWatchNearbyApplyModifiersOncePerTurn.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierSummonWatchNearbyApplyModifiersOncePerTurn;
