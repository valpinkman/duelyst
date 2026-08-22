/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierEndEveryTurnWatch = require('./modifierEndEveryTurnWatch');

class ModifierEndEveryTurnWatchDamageOwner extends ModifierEndEveryTurnWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierEndEveryTurnWatchDamageOwner';
  static modifierName = 'Turn Watch';
  static description = 'At end of EACH turn, deal %X damage to your General';

  static createContextObject(damageAmount, options) {
    if (damageAmount == null) {
      damageAmount = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const replaceText = this.description.replace(/%X/, modifierContextObject.damageAmount);
      return replaceText;
    }
    return this.description;
  }

  onTurnWatch(action) {
    super.onTurnWatch(action);

    const myGeneral = this.getGameSession().getGeneralForPlayer(this.getCard().getOwner());

    if (myGeneral != null) {
      const damageAction = new DamageAction(this.getGameSession());
      damageAction.setOwnerId(this.getCard().getOwnerId());
      damageAction.setSource(this.getCard());
      damageAction.setTarget(myGeneral);
      damageAction.setDamageAmount(this.damageAmount);
      return this.getGameSession().executeAction(damageAction);
    }
  }
}
ModifierEndEveryTurnWatchDamageOwner.prototype.type = 'ModifierEndEveryTurnWatchDamageOwner';
ModifierEndEveryTurnWatchDamageOwner.prototype.fxResource = [
  'FX.Modifiers.ModifierEndTurnWatch',
  'FX.Modifiers.ModifierGenericDamageEnergySmall',
];

module.exports = ModifierEndEveryTurnWatchDamageOwner;
