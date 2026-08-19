/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOverwatch = require('./modifierOverwatch');
const AttackAction = require('../actions/attackAction');

class ModifierOverwatchAttacked extends ModifierOverwatch {
  declare type: any;

  static type = 'ModifierOverwatchAttacked';
  static description = 'When this minion is attacked, %X';

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description.replace(/%X/, modifierContextObject.description);
    }
    return super.getDescription();
  }

  getIsActionRelevant(action) {
    // watch for explicit attacks on this unit
    return action instanceof AttackAction && !action.getIsImplicit() && (action.getTarget() === this.getCard());
  }
}
ModifierOverwatchAttacked.prototype.type = 'ModifierOverwatchAttacked';

module.exports = ModifierOverwatchAttacked;
