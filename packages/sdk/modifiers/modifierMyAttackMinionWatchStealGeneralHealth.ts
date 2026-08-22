/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const HealAction = require('@duelyst/sdk/actions/healAction');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierMyAttackMinionWatch = require('./modifierMyAttackMinionWatch');

class ModifierMyAttackMinionWatchStealGeneralHealth extends ModifierMyAttackMinionWatch {
  declare type: any;
  declare stealAmount: any;

  static type = 'ModifierMyAttackMinionWatchStealGeneralHealth';

  static createContextObject(stealAmount, options) {
    if (stealAmount == null) {
      stealAmount = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.stealAmount = stealAmount;
    return contextObject;
  }

  onMyAttackMinionWatch(action) {
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());

    const healAction = new HealAction(this.getGameSession());
    healAction.setOwnerId(this.getOwnerId());
    healAction.setTarget(general);
    healAction.setHealAmount(this.stealAmount);
    this.getGameSession().executeAction(healAction);

    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(
        this.getGameSession().getOpponentPlayerIdOfPlayerId(this.getCard().getOwnerId()),
      );

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.getOwnerId());
    damageAction.setTarget(enemyGeneral);
    damageAction.setDamageAmount(this.stealAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
ModifierMyAttackMinionWatchStealGeneralHealth.prototype.type =
  'ModifierMyAttackMinionWatchStealGeneralHealth';
ModifierMyAttackMinionWatchStealGeneralHealth.prototype.stealAmount = 0;

module.exports = ModifierMyAttackMinionWatchStealGeneralHealth;
