/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishDamageNearbyEnemies extends ModifierDyingWish {
  static type = 'ModifierDyingWishDamageNearbyEnemies';
  static description = 'This minion deals %X damage to all enemies around it';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onDyingWish() {
    const validEntities = this.getGameSession().getBoard().getEnemyEntitiesAroundEntity(this.getCard(), CardType.Unit, 1);

    return (() => {
      const result = [];
      for (var entity of Array.from(validEntities)) {
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
ModifierDyingWishDamageNearbyEnemies.prototype.type = 'ModifierDyingWishDamageNearbyEnemies';
ModifierDyingWishDamageNearbyEnemies.prototype.damageAmount = 0;
ModifierDyingWishDamageNearbyEnemies.prototype.fxResource = ['FX.Modifiers.ModifierDyingWishDamageNearbyAllies', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierDyingWishDamageNearbyEnemies;
