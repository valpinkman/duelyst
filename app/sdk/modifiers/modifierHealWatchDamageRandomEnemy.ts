/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const RandomDamageAction = require('app/sdk/actions/randomDamageAction');
const Modifier = require('./modifier');
const ModifierHealWatch = require('./modifierHealWatch');

class ModifierHealWatchDamageRandomEnemy extends ModifierHealWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierHealWatchDamageRandomEnemy';
  static modifierName = 'Heal Watch Damage Random Enemy for X';
  static description = 'Whenever anything is healed, a random enemy takes damage';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onHealWatch(action) {
    let damageAmount;
    if (!this.damageAmount) {
      damageAmount = action.getTotalHealApplied();
    } else {
      ({
        damageAmount,
      } = this);
    }

    if (damageAmount > 0) {
      const randomDamageAction = new RandomDamageAction(this.getGameSession());
      randomDamageAction.setOwnerId(this.getCard().getOwnerId());
      randomDamageAction.setSource(this.getCard());
      randomDamageAction.setDamageAmount(damageAmount);
      randomDamageAction.canTargetGenerals = true;
      return this.getGameSession().executeAction(randomDamageAction);
    }
  }
}
ModifierHealWatchDamageRandomEnemy.prototype.type = 'ModifierHealWatchDamageRandomEnemy';
ModifierHealWatchDamageRandomEnemy.prototype.fxResource = ['FX.Modifiers.ModifierHealWatch', 'FX.Modifiers.ModifierGenericDamageSmall'];

module.exports = ModifierHealWatchDamageRandomEnemy;
