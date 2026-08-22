/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierDealDamageWatchDamageJoinedEnemies extends ModifierDealDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDealDamageWatchDamageJoinedEnemies';
  static modifierName = 'Deal Damage to an enemy and all joined enemies';
  static description = 'Whenever this minion deals damage to an enemy, damage all joined enemies';

  onDealDamage(action) {
    const unit = action.getTarget();
    if (unit != null && unit.getOwnerId() !== this.getCard().getOwnerId()) {
      const damagedPositions = [];
      const damageAmount = action.getDamageAmount();
      const position = unit.getPosition();
      damagedPositions.push(position);

      return this.damageEnemiesNearby(damageAmount, unit, damagedPositions);
    }
  }

  damageEnemiesNearby(damageAmount, unit, damagedPositions) {
    const enemiesNearby = this.getGameSession()
      .getBoard()
      .getFriendlyEntitiesAroundEntity(unit, CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var enemy of Array.from<any>(enemiesNearby)) {
        if (enemy != null) {
          var enemyPosition = enemy.getPosition();
          var alreadyDamaged = false;
          for (var position of Array.from<any>(damagedPositions)) {
            if (enemyPosition.x === position.x && enemyPosition.y === position.y) {
              alreadyDamaged = true;
              break;
            }
          }
          if (!alreadyDamaged) {
            var damageAction = new DamageAction(this.getGameSession());
            damageAction.setOwnerId(this.getCard().getOwnerId());
            damageAction.setSource(this.getCard());
            damageAction.setTarget(enemy);
            damageAction.setDamageAmount(damageAmount);
            this.getGameSession().executeAction(damageAction);

            damagedPositions.push(enemyPosition);
            result.push(this.damageEnemiesNearby(damageAmount, enemy, damagedPositions));
          } else {
            result.push(undefined);
          }
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierDealDamageWatchDamageJoinedEnemies.prototype.type =
  'ModifierDealDamageWatchDamageJoinedEnemies';
ModifierDealDamageWatchDamageJoinedEnemies.prototype.fxResource = [
  'FX.Modifiers.ModifierGenericChainLightning',
];

module.exports = ModifierDealDamageWatchDamageJoinedEnemies;
