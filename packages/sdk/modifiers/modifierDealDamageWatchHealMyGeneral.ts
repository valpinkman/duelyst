/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierDealDamageWatchHealMyGeneral extends ModifierDealDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDealDamageWatchHealMyGeneral';
  static modifierName = 'Deal Damage Watch';
  static description = 'Whenever this minion deals damage, restore %X Health to your General';

  static createContextObject(healAmount, options) {
    if (healAmount == null) {
      healAmount = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.healAmount);
    }
    return this.description;
  }

  onDealDamage(action) {
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());

    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getCard().getOwnerId());
    healAction.setTarget(general);
    healAction.setHealAmount(this.healAmount);
    return this.getGameSession().executeAction(healAction);
  }
}
ModifierDealDamageWatchHealMyGeneral.prototype.type = 'ModifierDealDamageWatchHealMyGeneral';
ModifierDealDamageWatchHealMyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierDealDamageWatch',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierDealDamageWatchHealMyGeneral;
