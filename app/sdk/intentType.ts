/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class IntentType {
  static NeutralIntent = 1;
  static DamageIntent = 2;
  static HealIntent = 3;
  static BuffIntent = 4;
  static NerfIntent = 5;
  static MoveIntent = 6;
  static DeckIntent = 7;
  static GameIntent = 8;
  static InspectIntent = 9;

  static getIsAggroIntentType(intentType) {
    // general check for aggresive intent types
    return (intentType === IntentType.DamageIntent) || (intentType === IntentType.NerfIntent);
  }

  static getIsAssistIntentType(intentType) {
    // general check for helpful intent types
    return (intentType === IntentType.HealIntent) || (intentType === IntentType.BuffIntent);
  }
}

module.exports = IntentType;
