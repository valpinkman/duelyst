/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierMyTeamMoveWatchAnyReason = require('./modifierMyTeamMoveWatchAnyReason');

class ModifierMyTeamMoveWatchAnyReasonBuffTarget extends ModifierMyTeamMoveWatchAnyReason {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierMyTeamMoveWatchAnyReasonBuffTarget';
  static modifierName = 'My Team Move Watch Any Reason Buff Target';
  static description = 'Whenever a friendly minion is moved for any reason, %Y';

  static createContextObject(modContextObject, description, options) {
    if (options == null) {
      options = undefined;
    }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modContextObject;
    contextObject.modDescription = description;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%Y/, modifierContextObject.modDescription);
    }
    return this.description;
  }

  onMyTeamMoveWatch(action, buffTarget) {
    // apply modifiers to card being summoned
    if (buffTarget != null) {
      return Array.from<any>(this.modifiersContextObjects).map((modifierContextObject) =>
        this.getGameSession().applyModifierContextObject(modifierContextObject, buffTarget),
      );
    }
  }
}
ModifierMyTeamMoveWatchAnyReasonBuffTarget.prototype.type =
  'ModifierMyTeamMoveWatchAnyReasonBuffTarget';
ModifierMyTeamMoveWatchAnyReasonBuffTarget.prototype.fxResource = [
  'FX.Modifiers.ModifierMyTeamMoveWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierMyTeamMoveWatchAnyReasonBuffTarget;
