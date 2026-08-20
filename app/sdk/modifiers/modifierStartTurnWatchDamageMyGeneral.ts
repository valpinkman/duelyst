/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');

const CONFIG = require('app/common/config');
const ModifierStartTurnWatch = require('./modifierStartTurnWatch');

class ModifierStartTurnWatchDamageMyGeneral extends ModifierStartTurnWatch {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierStartTurnWatchDamageMyGeneral';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  onTurnWatch(action) {
    super.onTurnWatch(action);

    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    if (general != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(general);
      if (!this.damageAmount) {
        damageAction.setDamageAmount(this.getCard().getATK());
      } else {
        damageAction.setDamageAmount(this.damageAmount);
      }
      return this.getGameSession().executeAction(damageAction);
    }
  }
}
ModifierStartTurnWatchDamageMyGeneral.prototype.type = 'ModifierStartTurnWatchDamageMyGeneral';
ModifierStartTurnWatchDamageMyGeneral.prototype.damageAmount = 0;
ModifierStartTurnWatchDamageMyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierStartTurnWatch',
  'FX.Modifiers.ModifierGenericChainLightningRed',
];

module.exports = ModifierStartTurnWatchDamageMyGeneral;
