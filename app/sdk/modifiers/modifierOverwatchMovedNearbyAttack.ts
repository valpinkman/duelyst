/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierOverwatchMovedNearby = require('./modifierOverwatchMovedNearby');

class ModifierOverwatchMovedNearbyAttack extends ModifierOverwatchMovedNearby {
  declare type: any;

  static type = 'ModifierOverwatchMovedNearbyAttack';

  onOverwatch(action) {
    const source = action.getSource();
    const attackAction = this.getCard().actionAttack(source);
    attackAction.setIsStrikebackAllowed(false);
    return this.getGameSession().executeAction(attackAction);
  }
}
ModifierOverwatchMovedNearbyAttack.prototype.type = 'ModifierOverwatchMovedNearbyAttack';

module.exports = ModifierOverwatchMovedNearbyAttack;
