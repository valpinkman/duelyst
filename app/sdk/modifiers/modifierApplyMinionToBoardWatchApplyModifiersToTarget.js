/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');
const ModifierApplyMinionToBoardWatch = require('./modifierApplyMinionToBoardWatch');

class ModifierApplyMinionToBoardWatchApplyModifiersToTarget extends ModifierApplyMinionToBoardWatch {
  static type = 'ModifierApplyMinionToBoardWatchApplyModifiersToTarget';

  static createContextObject(modifiersContextObjects, buffDescription, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = modifiersContextObjects;
    contextObject.buffDescription = buffDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.apply_minion_to_board_watch_apply_modifiers_to_target_def', { desc: this.buffDescription });
    }
    return this.description;
  }

  onApplyToBoardWatch(action) {
    const summonedUnitPosition = __guard__(action.getTarget(), (x) => x.getPosition());

    if (this.modifiersContextObjects != null) {
      const entity = action.getTarget();
      if (entity != null) {
        return Array.from(this.modifiersContextObjects).map((modifierContextObject) =>
          this.getGameSession().applyModifierContextObject(modifierContextObject, entity));
      }
    }
  }
}
ModifierApplyMinionToBoardWatchApplyModifiersToTarget.prototype.type = 'ModifierApplyMinionToBoardWatchApplyModifiersToTarget';
ModifierApplyMinionToBoardWatchApplyModifiersToTarget.modifierName = i18next.t('modifiers.apply_minion_to_board_watch_apply_modifiers_to_target_name');
ModifierApplyMinionToBoardWatchApplyModifiersToTarget.description = i18next.t('modifiers.apply_minion_to_board_watch_apply_modifiers_to_target_def');
ModifierApplyMinionToBoardWatchApplyModifiersToTarget.prototype.fxResource = ['FX.Modifiers.ModifierApplyMinionToBoardWatch', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierApplyMinionToBoardWatchApplyModifiersToTarget;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
