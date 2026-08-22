/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierIntensify = require('./modifierIntensify');

class ModifierIntensifyDamageEnemyGeneral extends ModifierIntensify {
  declare type: any;
  declare damageAmount: any;

  static type = 'ModifierIntensifyDamageEnemyGeneral';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onIntensify() {
    const totalDamageAmount = this.getIntensifyAmount() * this.damageAmount;

    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());

    const enemyDamageAction = new DamageAction(this.getGameSession());
    enemyDamageAction.setOwnerId(this.getCard().getOwnerId());
    enemyDamageAction.setSource(this.getCard());
    enemyDamageAction.setTarget(enemyGeneral);
    enemyDamageAction.setDamageAmount(totalDamageAmount);
    return this.getGameSession().executeAction(enemyDamageAction);
  }
}
ModifierIntensifyDamageEnemyGeneral.prototype.type = 'ModifierIntensifyDamageEnemyGeneral';
ModifierIntensifyDamageEnemyGeneral.prototype.damageAmount = 0;

module.exports = ModifierIntensifyDamageEnemyGeneral;
