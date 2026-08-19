/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierOpponentSummonWatch = require('./modifierOpponentSummonWatch');

class ModifierOpponentSummonWatchDamageEnemyGeneral extends ModifierOpponentSummonWatch {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierOpponentSummonWatchDamageEnemyGeneral';
  static modifierName = 'Opponent Summon Watch';
  static description = 'Whenever your opponent summons a minion, deal %X damage to the enemy General';

  static createContextObject(damageAmount, options) {
    if (damageAmount == null) { damageAmount = 0; }
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

  onSummonWatch(action) {
    const general = this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());
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
ModifierOpponentSummonWatchDamageEnemyGeneral.prototype.type = 'ModifierOpponentSummonWatchDamageEnemyGeneral';
ModifierOpponentSummonWatchDamageEnemyGeneral.prototype.damageAmount = 0;
ModifierOpponentSummonWatchDamageEnemyGeneral.prototype.fxResource = ['FX.Modifiers.ModifierOpponentSummonWatch', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierOpponentSummonWatchDamageEnemyGeneral;
