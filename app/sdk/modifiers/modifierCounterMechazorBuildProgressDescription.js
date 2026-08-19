/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierCounterMechazorBuildProgressDescription extends Modifier {
  static type = 'ModifierCounterMechazorBuildProgressDescription';

  static createContextObject(percentComplete) {
    const contextObject = super.createContextObject();
    contextObject.percentComplete = percentComplete;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.mechazor_counter_applied_desc', { percent_complete: modifierContextObject.percentComplete });
    }
  }
}
ModifierCounterMechazorBuildProgressDescription.prototype.type = 'ModifierCounterMechazorBuildProgressDescription';
ModifierCounterMechazorBuildProgressDescription.prototype.maxStacks = 1;

module.exports = ModifierCounterMechazorBuildProgressDescription;
