/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const QuestFactory = require('app/sdk/quests/questFactory');
const i18next = require('i18next');

class EpicQuestorAchievement extends Achievement {
  static id = 'epicQuestor';
  static progressRequired = 5;
  static rewards = { neutralEpicCard: 1 };

  static progressForCompletingQuestId(questId) {
    const sdkQuest = QuestFactory.questForIdentifier(questId);
    if ((sdkQuest != null) && !sdkQuest.isBeginner) {
      return 1;
    }
    return 0;
  }
}
EpicQuestorAchievement.title = i18next.t('achievements.epic_questor_title');
EpicQuestorAchievement.description = i18next.t('achievements.epic_questor_desc');

module.exports = EpicQuestorAchievement;
