/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const ModifierSentinelOpponentSummon = require('./modifierSentinelOpponentSummon');

class ModifierSentinelOpponentSummonDamageIt extends ModifierSentinelOpponentSummon {
  static type = 'ModifierSentinelOpponentSummonDamageIt';

  static createContextObject(description, transformCardId, damageAmount, options) {
    if (damageAmount == null) { damageAmount = 0; }
    const contextObject = super.createContextObject(description, transformCardId, options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onOverwatch(action) {
    super.onOverwatch(action); // transform unit
    // damage unit that was just summoned by enemy
    if (action.getTarget() != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(action.getTarget());
      damageAction.setDamageAmount(this.damageAmount);
      return this.getGameSession().executeAction(damageAction);
    }
  }
}
ModifierSentinelOpponentSummonDamageIt.prototype.type = 'ModifierSentinelOpponentSummonDamageIt';

module.exports = ModifierSentinelOpponentSummonDamageIt;
