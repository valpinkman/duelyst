/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class QuestType {
  static Promotional = -5;
  static Seasonal = -4;
  static CatchUp = -3;
  static Beginner = -2;
  static ExcludeFromSystem = -1;
  static Participation = 0;
  static Win = 1;
  static Social = 2;
  static Challenge = 3;
  static ShortQuest = 101;
  static LongQuest = 102;
}

module.exports = QuestType;
