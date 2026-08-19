/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomDamageAction = require('app/sdk/actions/randomDamageAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierReplaceWatch = require('./modifierReplaceWatch');

class ModifierReplaceWatchDamageEnemy extends ModifierReplaceWatch {
  static type = 'ModifierReplaceWatchDamageEnemy';
  static modifierName = 'Replace Watch (damage random enemy)';
  static description = 'Whenever you replace a card, deal %X damage to a random enemy';

  static createContextObject(damageAmount, options) {
    if (options == null) { options = undefined; }
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

  onReplaceWatch(action) {
    const randomDamageAction = new RandomDamageAction(this.getGameSession());
    randomDamageAction.setOwnerId(this.getCard().getOwnerId());
    randomDamageAction.setSource(this.getCard());
    randomDamageAction.setDamageAmount(this.damageAmount);
    randomDamageAction.canTargetGenerals = true;
    return this.getGameSession().executeAction(randomDamageAction);
  }
}
ModifierReplaceWatchDamageEnemy.prototype.type = 'ModifierReplaceWatchDamageEnemy';
ModifierReplaceWatchDamageEnemy.prototype.fxResource = ['FX.Modifiers.ModifierReplaceWatch', 'FX.Modifiers.ModifierGenericDamageSmall'];

module.exports = ModifierReplaceWatchDamageEnemy;
