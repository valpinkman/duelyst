/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierBackstabWatch = require('./modifierBackstabWatch');

class ModifierBackstabWatchApplyModifiersToTarget extends ModifierBackstabWatch {
  declare type: any;
  declare modifiersContextObjects: any;

  static type = 'ModifierBackstabWatchApplyModifiersToTarget';

  static createContextObject(modifiersContextObjects, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    return contextObject;
  }

  onBackstabWatch(action) {
    const target = action.getTarget();
    if ((target != null) && (this.modifiersContextObjects != null)) {
      return (() => {
        const result = [];
        for (var modifier of Array.from<any>(this.modifiersContextObjects)) {
          if (modifier != null) {
            result.push(this.getGameSession().applyModifierContextObject(modifier, target));
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierBackstabWatchApplyModifiersToTarget.prototype.type = 'ModifierBackstabWatchApplyModifiersToTarget';
ModifierBackstabWatchApplyModifiersToTarget.prototype.modifiersContextObjects = null;

module.exports = ModifierBackstabWatchApplyModifiersToTarget;
