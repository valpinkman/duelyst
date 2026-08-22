/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierMyAttackWatch = require('./modifierMyAttackWatch');

class ModifierMyAttackWatchApplyModifiers extends ModifierMyAttackWatch {
  declare type: any;
  declare modifiersContextObjects: any;
  declare fxResource: any;

  static type = 'ModifierMyAttackWatchApplyModifiers';

  static createContextObject(modifiersContextObjects, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    return contextObject;
  }

  onMyAttackWatch(action) {
    if (this.modifiersContextObjects != null) {
      return (() => {
        const result = [];
        for (var modifier of Array.from<any>(this.modifiersContextObjects)) {
          if (modifier != null) {
            result.push(this.getGameSession().applyModifierContextObject(modifier, this.getCard()));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierMyAttackWatchApplyModifiers.prototype.type = 'ModifierMyAttackWatchApplyModifiers';
ModifierMyAttackWatchApplyModifiers.prototype.modifiersContextObjects = null;
ModifierMyAttackWatchApplyModifiers.prototype.fxResource = ['FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierMyAttackWatchApplyModifiers;
