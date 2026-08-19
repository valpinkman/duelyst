/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishDamageGeneral extends ModifierDyingWish {
  declare type: any;
  declare name: any;
  declare description: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishDamageGeneral';
  static appliedName = 'Agonizing Death';
  static appliedDescription = '';

  static getAppliedDescription(contextObject) {
    if (this.damageAmount) {
      return `When this minion dies, deal ${damageAmount} damage to its general`;
    }
    return 'When this minion dies, deal its attack in damage to its general';
  }

  onDyingWish() {
    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    if (general != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setTarget(general);
      if (!this.damageAmount) {
        damageAction.setDamageAmount(this.getCard().getATK());
      } else {
        damageAction.setDamageAmount(this.damageAmount);
      }
      return this.getGameSession().executeAction(damageAction);
    }
  }
}
ModifierDyingWishDamageGeneral.prototype.type = 'ModifierDyingWishDamageGeneral';
ModifierDyingWishDamageGeneral.prototype.name = 'Dying Wish: Damage General';
ModifierDyingWishDamageGeneral.prototype.description = 'When this minion dies, deal damage to its general';
ModifierDyingWishDamageGeneral.prototype.damageAmount = null;
ModifierDyingWishDamageGeneral.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierDyingWishDamageGeneral;
