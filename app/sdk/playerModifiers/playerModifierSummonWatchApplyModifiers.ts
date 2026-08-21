/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierSummonWatch = require('./playerModifierSummonWatch');

/*
  Summon watch that remains active whether the original entity dies or not.
*/
class PlayerModifierSummonWatchApplyModifiers extends PlayerModifierSummonWatch {
  declare type: any;

  static type = 'PlayerModifierSummonWatchApplyModifiers';

  static createContextObject(modifiersContextObjects, buffDescription, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.buffDescription = buffDescription;
    return contextObject;
  }

  onSummonWatch(action?) {
    const entity = action.getTarget();
    if (entity != null) {
      return Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
        this.getGameSession().applyModifierContextObject(modifierContextObject, entity),
      );
    }
  }
}
PlayerModifierSummonWatchApplyModifiers.prototype.type = 'PlayerModifierSummonWatchApplyModifiers';

module.exports = PlayerModifierSummonWatchApplyModifiers;
