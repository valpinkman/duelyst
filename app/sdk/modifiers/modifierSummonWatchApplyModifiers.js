/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const UtilsGameSession = require('app/common/utils/utils_game_session');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchApplyModifiers extends ModifierSummonWatch {
  static type = 'ModifierSummonWatchApplyModifiers';
  static description = 'Other minions you summon %X';

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

  onSummonWatch(action) {
    const summonedUnitPosition = __guard__(action.getTarget(), (x) => x.getPosition());

    if ((this.modifiersContextObjects != null) && this.getIsValidBuffPosition(summonedUnitPosition)) {
      const entity = action.getTarget();
      if (entity != null) {
        return Array.from(this.modifiersContextObjects).map((modifierContextObject) =>
          this.getGameSession().applyModifierContextObject(modifierContextObject, entity));
      }
    }
  }

  getIsValidBuffPosition(summonedUnitPosition) {
    // override this in subclass to filter by position
    return true;
  }
}
ModifierSummonWatchApplyModifiers.prototype.type = 'ModifierSummonWatchApplyModifiers';
ModifierSummonWatchApplyModifiers.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierSummonWatchApplyModifiers;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
