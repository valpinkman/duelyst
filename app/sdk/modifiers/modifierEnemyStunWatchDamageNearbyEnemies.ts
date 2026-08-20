/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierEnemyStunWatch = require('./modifierEnemyStunWatch');

class ModifierEnemyStunWatchDamageNearbyEnemies extends ModifierEnemyStunWatch {
  declare type: any;
  declare fxResource: any;
  declare damageAmount: any;

  static type = 'ModifierEnemyStunWatchDamageNearbyEnemies';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject();
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onEnemyStunWatch(action) {
    const entities = this.getGameSession()
      .getBoard()
      .getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        if (entity != null) {
          var damageAction = new DamageAction(this.getGameSession());
          damageAction.setOwnerId(this.getCard().getOwnerId());
          damageAction.setSource(this.getCard());
          damageAction.setTarget(entity);
          damageAction.setDamageAmount(this.damageAmount);
          result.push(this.getGameSession().executeAction(damageAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
ModifierEnemyStunWatchDamageNearbyEnemies.prototype.type =
  'ModifierEnemyStunWatchDamageNearbyEnemies';
ModifierEnemyStunWatchDamageNearbyEnemies.prototype.fxResource = [
  'FX.Modifiers.ModifierMyMoveWatch',
];
ModifierEnemyStunWatchDamageNearbyEnemies.prototype.damageAmount = 0;

module.exports = ModifierEnemyStunWatchDamageNearbyEnemies;
