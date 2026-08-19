/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierCounterBuildProgressDescription extends Modifier {
  declare type: any;
  declare maxStacks: any;

  static type = 'ModifierCounterBuildProgressDescription';

  static createContextObject(turnsLeft) {
    const contextObject = super.createContextObject();
    contextObject.turnsLeft = turnsLeft;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.building_counter_applied_desc', { turns_until_complete: modifierContextObject.turnsLeft });
    }
  }
}
ModifierCounterBuildProgressDescription.prototype.type = 'ModifierCounterBuildProgressDescription';
ModifierCounterBuildProgressDescription.prototype.maxStacks = 1;

module.exports = ModifierCounterBuildProgressDescription;
