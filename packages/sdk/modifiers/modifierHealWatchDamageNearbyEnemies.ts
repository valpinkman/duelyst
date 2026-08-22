/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const Modifier = require('./modifier');
const ModifierHealWatch = require('./modifierHealWatch');

class ModifierHealWatchDamageNearbyEnemies extends ModifierHealWatch {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierHealWatchDamageNearbyEnemies';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject();
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onHealWatch(action) {
    const entities = this.getGameSession()
      .getBoard()
      .getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);
    return (() => {
      const result = [];
      for (var entity of Array.from<any>(entities)) {
        var damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setSource(this.getCard());
        damageAction.setTarget(entity);
        damageAction.setDamageAmount(this.damageAmount);
        result.push(this.getGameSession().executeAction(damageAction));
      }
      return result;
    })();
  }
}
ModifierHealWatchDamageNearbyEnemies.prototype.type = 'ModifierHealWatchDamageNearbyEnemies';
ModifierHealWatchDamageNearbyEnemies.prototype.damageAmount = 0;
ModifierHealWatchDamageNearbyEnemies.prototype.fxResource = [
  'FX.Modifiers.ModifierHealWatch',
  'FX.Modifiers.ModifierGenericDamageNearby',
];

module.exports = ModifierHealWatchDamageNearbyEnemies;
