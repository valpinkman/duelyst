/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierCounterShadowCreepDescriptionProgressDescription extends Modifier {
  declare type: any;
  declare maxStacks: any;

  static type = 'ModifierCounterShadowCreepDescriptionProgressDescription';

  static createContextObject(tileCount) {
    const contextObject = super.createContextObject();
    contextObject.tileCount = tileCount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return i18next.t('modifiers.shadowcreep_counter_applied_desc', {
        tile_count: modifierContextObject.tileCount,
      });
    }
  }
}
ModifierCounterShadowCreepDescriptionProgressDescription.prototype.type =
  'ModifierCounterShadowCreepDescriptionProgressDescription';
ModifierCounterShadowCreepDescriptionProgressDescription.prototype.maxStacks = 1;

module.exports = ModifierCounterShadowCreepDescriptionProgressDescription;
