/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOverwatch = require('./modifierOverwatch');
const MoveAction = require('../actions/moveAction');

class ModifierOverwatchMovedNearby extends ModifierOverwatch {
  declare type: any;

  static type = 'ModifierOverwatchMovedNearby';
  static description = 'When an enemy minion moves next to this minion, %X';

  static getDescription(modifierContextObject) {
    if (modifierContextObject != null) {
      return this.description.replace(/%X/, modifierContextObject.description);
    }
    return super.getDescription();
  }

  getIsActionRelevant(action) {
    // watch for explicit minion move next to this unit
    if (action instanceof MoveAction && !action.getIsImplicit()) {
      const card = this.getCard();
      const source = action.getSource();
      if ((source !== card) && !source.getIsSameTeamAs(card) && !source.getIsGeneral()) {
        const myPosition = card.getPosition();
        const targetPosition = action.getTargetPosition();
        return (Math.abs(myPosition.x - targetPosition.x) <= 1) && (Math.abs(myPosition.y - targetPosition.y) <= 1);
      }
    }
    return false;
  }
}
ModifierOverwatchMovedNearby.prototype.type = 'ModifierOverwatchMovedNearby';

module.exports = ModifierOverwatchMovedNearby;
