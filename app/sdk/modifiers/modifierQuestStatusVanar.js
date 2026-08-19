/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierQuestStatus = require('./modifierQuestStatus');

class ModifierQuestStatusVanar extends ModifierQuestStatus {
  static type = 'ModifierQuestStatusVanar';

  static createContextObject(questCompleted, numTokensFound) {
    const contextObject = super.createContextObject();
    contextObject.questCompleted = questCompleted;
    contextObject.numTokensFound = numTokensFound;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      if (modifierContextObject.questCompleted) {
        return i18next.t('modifiers.quest_completed_applied_desc');
      }
      return i18next.t('modifiers.vanarquest_counter_applied_desc', { token_count: modifierContextObject.numTokensFound });
    }
  }

  static getName(modifierContextObject) {
    return i18next.t('modifiers.vanarquest_counter_applied_name');
  }
}
ModifierQuestStatusVanar.prototype.type = 'ModifierQuestStatusVanar';

module.exports = ModifierQuestStatusVanar;
