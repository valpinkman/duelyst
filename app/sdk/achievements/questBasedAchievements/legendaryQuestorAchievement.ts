/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('app/sdk/achievements/achievement');
const QuestFactory = require('app/sdk/quests/questFactory');
const i18next = require('i18next');

class LegendaryQuestorAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'legendaryQuestor';
  static progressRequired = 13;
  static rewards = { neutralLegendaryCard: 1 };

  static progressForCompletingQuestId(questId) {
    const sdkQuest = QuestFactory.questForIdentifier(questId);
    if (sdkQuest != null && !sdkQuest.isBeginner) {
      return 1;
    }
    return 0;
  }
}
LegendaryQuestorAchievement.title = i18next.t('achievements.legendary_questor_title');
LegendaryQuestorAchievement.description = i18next.t('achievements.legendary_questor_desc');

module.exports = LegendaryQuestorAchievement;
