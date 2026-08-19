/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const KillAction = require('app/sdk/actions/killAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDestroyEnemyMinions extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDestroyEnemyMinions';

  onOpeningGambit() {
    const entities = this.getGameSession().getBoard().getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, CONFIG.WHOLE_BOARD_RADIUS);

    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        if (!entity.getIsGeneral()) { // this ability only kills minions, not Generals
          var killAction = new KillAction(this.getGameSession());
          killAction.setOwnerId(this.getCard().getOwnerId());
          killAction.setSource(this.getCard());
          killAction.setTarget(entity);
          result.push(this.getGameSession().executeAction(killAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierOpeningGambitDestroyEnemyMinions.prototype.type = 'ModifierOpeningGambitDestroyEnemyMinions';
ModifierOpeningGambitDestroyEnemyMinions.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];

module.exports = ModifierOpeningGambitDestroyEnemyMinions;
