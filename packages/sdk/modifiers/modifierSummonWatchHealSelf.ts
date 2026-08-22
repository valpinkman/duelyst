/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const CONFIG = require('@duelyst/common/config');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchHealSelf extends ModifierSummonWatch {
  declare type: any;
  declare name: any;
  declare description: any;
  declare healAmount: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchHealSelf';

  static createContextObject(healAmount, options) {
    if (healAmount == null) {
      healAmount = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.healAmount = healAmount;
    return contextObject;
  }

  onSummonWatch(action?) {
    const healAction = new HealAction(this.getCard().getGameSession());
    healAction.setHealAmount(this.healAmount);
    healAction.setSource(this.getCard());
    healAction.setTarget(this.getCard());
    return this.getCard().getGameSession().executeAction(healAction);
  }

  getIsCardRelevantToWatcher(card) {
    return card.getDamage() > 0;
  }
}
ModifierSummonWatchHealSelf.prototype.type = 'ModifierSummonWatchHealSelf';
ModifierSummonWatchHealSelf.prototype.name = 'Summon Watch Heal Self';
ModifierSummonWatchHealSelf.prototype.description = 'Whenever you summon a minion, heal this unit';
ModifierSummonWatchHealSelf.prototype.healAmount = 0;
ModifierSummonWatchHealSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericHeal',
];
// only heal if unit is currently damaged

module.exports = ModifierSummonWatchHealSelf;
