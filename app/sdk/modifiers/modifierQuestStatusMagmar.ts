/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierQuestStatus = require('./modifierQuestStatus');

class ModifierQuestStatusMagmar extends ModifierQuestStatus {
  declare type: any;

  static type = 'ModifierQuestStatusMagmar';

  static createContextObject(questCompleted, numBuffSpells) {
    const contextObject = super.createContextObject();
    contextObject.questCompleted = questCompleted;
    contextObject.numBuffSpells = numBuffSpells;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      if (modifierContextObject.questCompleted) {
        return i18next.t('modifiers.quest_completed_applied_desc');
      }
      return i18next.t('modifiers.magmarquest_counter_applied_desc', { spell_count: modifierContextObject.numBuffSpells });
    }
  }

  static getName(modifierContextObject) {
    return i18next.t('modifiers.magmarquest_counter_applied_name');
  }
}
ModifierQuestStatusMagmar.prototype.type = 'ModifierQuestStatusMagmar';

module.exports = ModifierQuestStatusMagmar;
