/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const HealAction = require('app/sdk/actions/healAction');

const CONFIG = require('app/common/config');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishDamageEnemyGeneralHealGeneral extends ModifierDyingWish {
  static type = 'ModifierDyingWishDamageEnemyGeneralHealGeneral';
  static description = 'Deal %X damage to the enemy General. Restore %X Health to your General';

  static createContextObject(healthChangeAmount) {
    if (healthChangeAmount == null) { healthChangeAmount = 0; }
    const contextObject = super.createContextObject();
    contextObject.healthChangeAmount = healthChangeAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/g, () => modifierContextObject.healthChangeAmount);
    }
    return this.description;
  }

  onDyingWish() {
    const enemyGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
    const myGeneral = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());

    if (enemyGeneral != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setTarget(enemyGeneral);
      damageAction.setDamageAmount(this.healthChangeAmount);
      this.getGameSession().executeAction(damageAction);
    }

    if (myGeneral != null) {
      const healAction = new HealAction(this.getGameSession());
      healAction.setOwnerId(this.getCard().getOwnerId());
      healAction.setTarget(myGeneral);
      healAction.setHealAmount(this.healthChangeAmount);
      return this.getGameSession().executeAction(healAction);
    }
  }
}
ModifierDyingWishDamageEnemyGeneralHealGeneral.prototype.type = 'ModifierDyingWishDamageEnemyGeneralHealGeneral';
ModifierDyingWishDamageEnemyGeneralHealGeneral.prototype.healthChangeAmount = 0;
ModifierDyingWishDamageEnemyGeneralHealGeneral.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish', 'FX.Modifiers.ModifierGenericChain'];

module.exports = ModifierDyingWishDamageEnemyGeneralHealGeneral;
