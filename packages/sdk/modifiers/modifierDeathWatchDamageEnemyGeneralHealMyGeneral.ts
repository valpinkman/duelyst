/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const HealAction = require('@duelyst/sdk/actions/healAction');
const ModifierDeathWatch = require('./modifierDeathWatch');

class ModifierDeathWatchDamageEnemyGeneralHealMyGeneral extends ModifierDeathWatch {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierDeathWatchDamageEnemyGeneral';
  static modifierName = 'Deathwatch';
  static description = 'Deal %X damage to the enemy General, and restore %Y Health to your General';

  static createContextObject(damageAmount, healAmount, options) {
    if (damageAmount == null) {
      damageAmount = 1;
    }
    if (healAmount == null) {
      healAmount = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const descriptionText = this.description.replace(/%X/, modifierContextObject.damageAmount);
      return descriptionText.replace(/%Y/, modifierContextObject.healAmount);
    }
    return this.description;
  }

  onDeathWatch(action) {
    // damage enemy General
    const general = this.getGameSession().getGeneralForOpponentOfPlayerId(
      this.getCard().getOwnerId(),
    );
    if (general != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(general);
      if (!this.damageAmount) {
        damageAction.setDamageAmount(this.getCard().getATK());
      } else {
        damageAction.setDamageAmount(this.damageAmount);
      }
      this.getGameSession().executeAction(damageAction);
    }

    // heal my General
    const myGeneral = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());
    if (myGeneral != null) {
      const healAction = new HealAction(this.getGameSession());
      healAction.setOwnerId(this.getCard().getOwnerId());
      healAction.setTarget(myGeneral);
      healAction.setHealAmount(this.healAmount);
      return this.getGameSession().executeAction(healAction);
    }
  }
}
ModifierDeathWatchDamageEnemyGeneralHealMyGeneral.prototype.type =
  'ModifierDeathWatchDamageEnemyGeneral';
ModifierDeathWatchDamageEnemyGeneralHealMyGeneral.prototype.damageAmount = 0;
ModifierDeathWatchDamageEnemyGeneralHealMyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierDeathwatch',
  'FX.Modifiers.ModifierGenericChain',
];

module.exports = ModifierDeathWatchDamageEnemyGeneralHealMyGeneral;
