/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierOpponentDrawCardWatch = require('./modifierOpponentDrawCardWatch');

class ModifierOpponentDrawCardWatchDamageEnemyGeneral extends ModifierOpponentDrawCardWatch {
  static type = 'ModifierOpponentDrawCardWatchDamageEnemyGeneral';
  static modifierName = 'ModifierOpponentDrawCardWatchDamageEnemyGeneral';
  static description = 'Whenever your opponent draws a card, deal %X damage to the enemy General';

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

  onDrawCardWatch(action) {
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
ModifierOpponentDrawCardWatchDamageEnemyGeneral.prototype.type = 'ModifierOpponentDrawCardWatchDamageEnemyGeneral';
ModifierOpponentDrawCardWatchDamageEnemyGeneral.prototype.fxResource = ['FX.Modifiers.ModifierOpponentDrawCardWatchBuffSelf', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierOpponentDrawCardWatchDamageEnemyGeneral;
