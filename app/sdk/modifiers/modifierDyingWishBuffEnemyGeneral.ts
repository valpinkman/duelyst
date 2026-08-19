/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierDyingWish = require('./modifierDyingWish');
const Modifier = require('./modifier');

class ModifierDyingWishBuffEnemyGeneral extends ModifierDyingWish {
  declare type: any;
  declare name: any;
  declare description: any;
  declare fxResource: any;

  static type = 'ModifierDyingWishBuffEnemyGeneral';
  static appliedName = 'Agonizing Death';
  static appliedDescription = '';

  static createContextObject(atkBuff, healthBuff, options) {
    if (atkBuff == null) { atkBuff = 2; }
    if (healthBuff == null) { healthBuff = 10; }
    const contextObject = super.createContextObject(options);
    contextObject.atkBuff = atkBuff;
    contextObject.healthBuff = healthBuff;
    return contextObject;
  }

  onDyingWish() {
    const enemyGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
    if (enemyGeneral != null) {
      const statContextObject = Modifier.createContextObjectWithAttributeBuffs(this.atkBuff, this.healthBuff);
      statContextObject.appliedName = i18next.t('modifiers.boss_36_applied_name');
      return this.getGameSession().applyModifierContextObject(statContextObject, enemyGeneral);
    }
  }
}
ModifierDyingWishBuffEnemyGeneral.prototype.type = 'ModifierDyingWishBuffEnemyGeneral';
ModifierDyingWishBuffEnemyGeneral.prototype.name = 'ModifierDyingWishBuffEnemyGeneral';
ModifierDyingWishBuffEnemyGeneral.prototype.description = 'When this minion dies, buff the enemy general';
ModifierDyingWishBuffEnemyGeneral.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierDyingWishBuffEnemyGeneral;
