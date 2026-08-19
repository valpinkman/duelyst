/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomDamageAction = require('app/sdk/actions/randomDamageAction');
const CONFIG = require('app/common/config');
const CardType = require('app/sdk/cards/cardType');
const ModifierTakeDamageWatch = require('./modifierTakeDamageWatch');

class ModifierTakeDamageWatchDamageEnemy extends ModifierTakeDamageWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierTakeDamageWatchDamageEnemy';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onDamageTaken(action) {
    const randomDamageAction = new RandomDamageAction(this.getGameSession());
    randomDamageAction.setOwnerId(this.getCard().getOwnerId());
    randomDamageAction.setSource(this.getCard());
    randomDamageAction.setDamageAmount(this.damageAmount);
    return this.getGameSession().executeAction(randomDamageAction);
  }
}
ModifierTakeDamageWatchDamageEnemy.prototype.type = 'ModifierTakeDamageWatchDamageEnemy';
ModifierTakeDamageWatchDamageEnemy.prototype.fxResource = ['FX.Modifiers.ModifierTakeDamageWatch', 'FX.Modifiers.ModifierGenericDamage'];

module.exports = ModifierTakeDamageWatchDamageEnemy;
