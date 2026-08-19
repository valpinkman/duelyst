/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RandomDamageAction = require('app/sdk/actions/randomDamageAction');
const ModifierMyAttackOrCounterattackWatch = require('./modifierMyAttackOrCounterattackWatch');

class ModifierMyAttackOrCounterattackWatchDamageRandomEnemy extends ModifierMyAttackOrCounterattackWatch {
  declare type: any;
  declare damageAmount: any;

  static type = 'ModifierMyAttackOrCounterattackWatchDamageRandomEnemy';

  static createContextObject(damageAmount, options) {
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onMyAttackOrCounterattackWatch(action) {
    const randomDamageAction = new RandomDamageAction(this.getGameSession());
    randomDamageAction.setOwnerId(this.getCard().getOwnerId());
    randomDamageAction.setSource(this.getCard());
    randomDamageAction.setDamageAmount(this.damageAmount);
    randomDamageAction.canTargetGenerals = true;
    return this.getGameSession().executeAction(randomDamageAction);
  }
}
ModifierMyAttackOrCounterattackWatchDamageRandomEnemy.prototype.type = 'ModifierMyAttackOrCounterattackWatchDamageRandomEnemy';
ModifierMyAttackOrCounterattackWatchDamageRandomEnemy.prototype.damageAmount = 0;

module.exports = ModifierMyAttackOrCounterattackWatchDamageRandomEnemy;
