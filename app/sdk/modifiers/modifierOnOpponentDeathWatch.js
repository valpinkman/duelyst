/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const ModifierDeathWatch = require('./modifierDeathWatch');

class ModifierOnOpponentDeathWatch extends ModifierDeathWatch {
  static type = 'ModifierOnOpponentDeathWatch';
  static modifierName = 'ModifierOnOpponentDeathWatch';
  static description = 'Summon a %X on a random nearby space';

  getIsActionRelevant(action) {
    return super.getIsActionRelevant(action) && !action.getTarget().getIsSameTeamAs(this.getCard());
  }
}
ModifierOnOpponentDeathWatch.prototype.type = 'ModifierOnOpponentDeathWatch';

module.exports = ModifierOnOpponentDeathWatch;
