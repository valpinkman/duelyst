/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('app/sdk/actions/healAction');
const ModifierEnemySpellWatch = require('./modifierEnemySpellWatch');

class ModifierEnemySpellWatchHealMyGeneral extends ModifierEnemySpellWatch {
  declare type: any;
  declare fxResource: any;
  declare healAmount: any;

  static type = 'ModifierEnemySpellWatchHealMyGeneral';

  static createContextObject(healAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  onEnemySpellWatch(action) {
    const myGeneral = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    if (myGeneral != null) {
      const healAction = new HealAction(this.getGameSession());
      healAction.setOwnerId(this.getCard().getOwnerId());
      healAction.setTarget(myGeneral);
      healAction.setHealAmount(this.healAmount);
      return this.getGameSession().executeAction(healAction);
    }
  }
}
ModifierEnemySpellWatchHealMyGeneral.prototype.type = 'ModifierEnemySpellWatchHealMyGeneral';
ModifierEnemySpellWatchHealMyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierSpellWatch',
  'FX.Modifiers.ModifierGenericHeal',
];
ModifierEnemySpellWatchHealMyGeneral.prototype.healAmount = 0;

module.exports = ModifierEnemySpellWatchHealMyGeneral;
