/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const HealAction = require('@duelyst/sdk/actions/healAction');
const ModifierMyGeneralDamagedWatch = require('./modifierMyGeneralDamagedWatch');

class ModifierMyGeneralDamagedWatchHealSelf extends ModifierMyGeneralDamagedWatch {
  declare type: any;
  declare healAmount: any;
  declare fxResource: any;

  static type = 'ModifierMyGeneralDamagedWatchHealSelf';
  static modifierName = 'My General Damage Watch Heal Self';
  static description = 'Whenever your General takes damage, %X';

  static createContextObject(healAmount, options) {
    if (healAmount == null) {
      healAmount = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject.healAmount > 0) {
      return this.description.replace(
        /%X/,
        `restore ${modifierContextObject.healAmount} Health to this minion`,
      );
    }
    return this.description.replace(/%X/, 'fully heal this minion');
  }

  onDamageDealtToGeneral(action) {
    if (this.getCard().getHP() < this.getCard().getMaxHP()) {
      const healAction = this.getCard().getGameSession().createActionForType(HealAction.type);
      healAction.setTarget(this.getCard());
      if (this.healAmount === 0) {
        // default, heal to full
        healAction.setHealAmount(this.getCard().getMaxHP() - this.getCard().getHP());
      } else {
        healAction.setHealAmount(this.healAmount);
      }
      return this.getCard().getGameSession().executeAction(healAction);
    }
  }
}
ModifierMyGeneralDamagedWatchHealSelf.prototype.type = 'ModifierMyGeneralDamagedWatchHealSelf';
ModifierMyGeneralDamagedWatchHealSelf.prototype.healAmount = 0;
ModifierMyGeneralDamagedWatchHealSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierMyGeneralDamagedWatch',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierMyGeneralDamagedWatchHealSelf;
