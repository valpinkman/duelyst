/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomDamageAction = require('app/sdk/actions/randomDamageAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierSynergize = require('./modifierSynergize');

class ModifierSynergizeDamageEnemy extends ModifierSynergize {
  static type = 'ModifierSynergizeDamageEnemy';
  static description = 'Deal %X damage to a random enemy';

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

  onSynergize(action) {
    const randomDamageAction = new RandomDamageAction(this.getGameSession());
    randomDamageAction.setOwnerId(this.getCard().getOwnerId());
    randomDamageAction.setSource(this.getCard());
    randomDamageAction.setDamageAmount(this.damageAmount);
    randomDamageAction.canTargetGenerals = true;
    return this.getGameSession().executeAction(randomDamageAction);
  }
}
ModifierSynergizeDamageEnemy.prototype.type = 'ModifierSynergizeDamageEnemy';
ModifierSynergizeDamageEnemy.prototype.fxResource = ['FX.Modifiers.ModifierSynergize', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierSynergizeDamageEnemy;
