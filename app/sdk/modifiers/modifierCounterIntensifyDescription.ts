/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierCounterIntensifyDescription extends Modifier {
  declare type: any;
  declare maxStacks: any;

  static type = 'ModifierCounterIntensifyDescription';

  static createContextObject(intensifyLevel) {
    const contextObject = super.createContextObject();
    contextObject.intensifyLevel = intensifyLevel;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.intensify_counter_applied_desc', {
        intensify_effect_level: modifierContextObject.intensifyLevel,
      });
    }
  }
}
ModifierCounterIntensifyDescription.prototype.type = 'ModifierCounterIntensifyDescription';
ModifierCounterIntensifyDescription.prototype.maxStacks = 1;

module.exports = ModifierCounterIntensifyDescription;
