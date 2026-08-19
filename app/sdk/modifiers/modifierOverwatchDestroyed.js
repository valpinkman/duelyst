/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOverwatch = require('./modifierOverwatch');
const DieAction = require('../actions/dieAction');

class ModifierOverwatchDestroyed extends ModifierOverwatch {
  static type = 'ModifierOverwatchDestroyed';
  static description = 'When this minion is destroyed, %X';

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description.replace(/%X/, modifierContextObject.description);
    }
    return super.getDescription();
  }

  getIsActionRelevant(action) {
    // watch for this unit dying
    return action instanceof DieAction && (action.getTarget() === this.getCard());
  }
}
ModifierOverwatchDestroyed.prototype.type = 'ModifierOverwatchDestroyed';

module.exports = ModifierOverwatchDestroyed;
