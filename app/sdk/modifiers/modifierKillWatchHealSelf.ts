/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const ModifierKillWatch = require('./modifierKillWatch');

class ModifierKillWatchHealSelf extends ModifierKillWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierKillWatchHealSelf';

  static createContextObject(healAmount, includeAllies, includeGenerals, options) {
    if (healAmount == null) {
      healAmount = 0;
    }
    if (includeAllies == null) {
      includeAllies = true;
    }
    if (includeGenerals == null) {
      includeGenerals = true;
    }
    const contextObject = super.createContextObject(includeAllies, includeGenerals, options);
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  onKillWatch(action) {
    const healAction = this.getCard().getGameSession().createActionForType(HealAction.type);
    healAction.setTarget(this.getCard());
    healAction.setHealAmount(this.healAmount);
    return this.getCard().getGameSession().executeAction(healAction);
  }
}
ModifierKillWatchHealSelf.prototype.type = 'ModifierKillWatchHealSelf';
ModifierKillWatchHealSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierKillWatch',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierKillWatchHealSelf;
