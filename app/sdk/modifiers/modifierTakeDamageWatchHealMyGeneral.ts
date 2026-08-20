/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchHealMyGeneral extends ModifierTakeDamageWatch {
  declare type: any;
  declare healAmount: any;
  declare fxResource: any;

  static type = 'ModifierTakeDamageWatchHealMyGeneral';
  static modifierName = 'Take Damage Watch';
  static description = 'Whenever this minion takes damage, restore %X Health to your General';

  static createContextObject(healAmount, options) {
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

  onDamageTaken(action) {
    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());

    if (general != null) {
      const healAction = new HealAction(this.getGameSession());
      healAction.setOwnerId(this.getCard().getOwnerId());
      healAction.setSource(this.getCard());
      healAction.setTarget(general);
      healAction.setHealAmount(this.healAmount);
      return this.getGameSession().executeAction(healAction);
    }
  }
}
ModifierTakeDamageWatchHealMyGeneral.prototype.type = 'ModifierTakeDamageWatchHealMyGeneral';
ModifierTakeDamageWatchHealMyGeneral.prototype.healAmount = 0;
ModifierTakeDamageWatchHealMyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierTakeDamageWatch',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierTakeDamageWatchHealMyGeneral;
