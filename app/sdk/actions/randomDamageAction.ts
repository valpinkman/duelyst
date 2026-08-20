/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Logger = require('app/common/logger');
const DamageAction = require('./damageAction');
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');

class RandomDamageAction extends DamageAction {
  declare canTargetGenerals: any;

  static type = 'RandomDamageAction';

  constructor() {
    super(...arguments);
  }

  _modifyForExecution() {
    super._modifyForExecution();

    // find target to damage
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const entities = this.getGameSession()
        .getBoard()
        .getEnemyEntitiesAroundEntity(this.getSource(), CardType.Unit, CONFIG.WHOLE_BOARD_RADIUS);
      const validEntities = [];
      for (var entity of Array.from<any>(entities)) {
        if (!entity.getIsGeneral() || this.canTargetGenerals) {
          validEntities.push(entity);
        }
      }

      if (validEntities.length > 0) {
        const unitToDamage =
          validEntities[this.getGameSession().getRandomIntegerForExecution(validEntities.length)];
        return this.setTarget(unitToDamage);
      }
    }
  }
}
RandomDamageAction.prototype.canTargetGenerals = false;

module.exports = RandomDamageAction;
