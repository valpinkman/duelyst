/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierDealDamageWatchHealorDamageGeneral extends ModifierDealDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDealDamageWatchHealorDamageGeneral';
  static modifierName = 'Deal Damage Watch';
  static description =
    'Whenever this minion deals damage, either deal %X damage to the enemy General OR restore %X Health to your General';

  static createContextObject(healDamageAmount, options) {
    if (healDamageAmount == null) {
      healDamageAmount = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.healDamageAmount = healDamageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/g, modifierContextObject.healDamageAmount);
    }
    return this.description;
  }

  onDealDamage(action) {
    super.onDealDamage(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const myGeneral = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
      const enemyGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(
        this.getCard().getOwnerId(),
      );
      const potentialTargets = [myGeneral, enemyGeneral];
      const target =
        potentialTargets[
          this.getGameSession().getRandomIntegerForExecution(potentialTargets.length)
        ];

      if (target === myGeneral) {
        const healAction = new HealAction(this.getGameSession());
        healAction.setOwnerId(this.getCard().getOwnerId());
        healAction.setTarget(myGeneral);
        healAction.setHealAmount(this.healDamageAmount);
        return this.getGameSession().executeAction(healAction);
      }
      if (target === enemyGeneral) {
        const damageAction = new DamageAction(this.getGameSession());
        damageAction.setOwnerId(this.getCard().getOwnerId());
        damageAction.setTarget(enemyGeneral);
        damageAction.setDamageAmount(this.healDamageAmount);
        return this.getGameSession().executeAction(damageAction);
      }
    }
  }
}
ModifierDealDamageWatchHealorDamageGeneral.prototype.type =
  'ModifierDealDamageWatchHealorDamageGeneral';
ModifierDealDamageWatchHealorDamageGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierDealDamageWatch',
];

module.exports = ModifierDealDamageWatchHealorDamageGeneral;
