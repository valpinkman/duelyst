/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const ModifierMyMinionAttackWatch = require('./modifierMyMinionAttackWatch');

class ModifierMyMinionAttackWatchHealGeneral extends ModifierMyMinionAttackWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierMyMinionAttackWatchHealGeneral';
  static modifierName = 'MyMinionAttackWatch Heal My General';
  static description = 'Whenever a friendly minion attacks, restore %X Health to your General';

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

  onMyMinionAttackWatch(action) {
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
ModifierMyMinionAttackWatchHealGeneral.prototype.type = 'ModifierMyMinionAttackWatchHealGeneral';
ModifierMyMinionAttackWatchHealGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierMyMinionAttackWatch',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierMyMinionAttackWatchHealGeneral;
