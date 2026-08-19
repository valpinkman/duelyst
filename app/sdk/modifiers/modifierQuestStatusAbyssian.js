/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierQuestStatus = require('./modifierQuestStatus');

class ModifierQuestStatusAbyssian extends ModifierQuestStatus {
  static type = 'ModifierQuestStatusAbyssian';

  static createContextObject(questCompleted, deathSpellActionCount) {
    const contextObject = super.createContextObject();
    contextObject.questCompleted = questCompleted;
    contextObject.deathSpellActionCount = deathSpellActionCount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      if (modifierContextObject.questCompleted) {
        return i18next.t('modifiers.quest_completed_applied_desc');
      }
      return i18next.t('modifiers.abyssianquest_counter_applied_desc', { spell_count: modifierContextObject.deathSpellActionCount });
    }
  }

  static getName(modifierContextObject) {
    return i18next.t('modifiers.abyssianquest_counter_applied_name');
  }
}
ModifierQuestStatusAbyssian.prototype.type = 'ModifierQuestStatusAbyssian';

module.exports = ModifierQuestStatusAbyssian;
