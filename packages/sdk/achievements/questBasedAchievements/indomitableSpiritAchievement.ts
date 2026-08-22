/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Achievement = require('@duelyst/sdk/achievements/achievement');
const QuestFactory = require('@duelyst/sdk/quests/questFactory');
const i18next = require('i18next');

class IndomitableSpiritAchievement extends Achievement {
  declare static title: any;
  declare static description: any;

  static id = 'indominatableSpirit';
  static progressRequired = 100;
  static rewards = { gold: 100 };

  static progressForCompletingQuestId(questId) {
    const sdkQuest = QuestFactory.questForIdentifier(questId);
    if (sdkQuest != null && !sdkQuest.isBeginner) {
      return 1;
    }
    return 0;
  }
}
IndomitableSpiritAchievement.title = i18next.t('achievements.indomitable_spirit_title');
IndomitableSpiritAchievement.description = i18next.t('achievements.indomitable_spirit_desc');

module.exports = IndomitableSpiritAchievement;
