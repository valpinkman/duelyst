/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const CardType = require('@duelyst/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const Modifier = require('./modifier');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitDamageBothGenerals extends ModifierOpeningGambit {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitDamageBothGenerals';
  static modifierName = 'Opening Gambit';
  static description = 'Deal %X damage to BOTH Generals';

  static createContextObject(damageAmount, options) {
    const contextObject = super.createContextObject();
    contextObject.damageAmount = damageAmount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onOpeningGambit() {
    const general = this.getCard()
      .getGameSession()
      .getGeneralForPlayerId(this.getCard().getOwnerId());

    const damageAction = new DamageAction(this.getGameSession());
    damageAction.setOwnerId(this.getCard().getOwnerId());
    damageAction.setSource(this.getCard());
    damageAction.setTarget(general);
    damageAction.setDamageAmount(this.damageAmount);
    this.getGameSession().executeAction(damageAction);

    const enemyGeneral = this.getCard()
      .getGameSession()
      .getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId());

    const enemyDamageAction = new DamageAction(this.getGameSession());
    enemyDamageAction.setOwnerId(this.getCard().getOwnerId());
    enemyDamageAction.setSource(this.getCard());
    enemyDamageAction.setTarget(enemyGeneral);
    enemyDamageAction.setDamageAmount(this.damageAmount);
    return this.getGameSession().executeAction(enemyDamageAction);
  }
}
ModifierOpeningGambitDamageBothGenerals.prototype.type = 'ModifierOpeningGambitDamageBothGenerals';
ModifierOpeningGambitDamageBothGenerals.prototype.damageAmount = 0;
ModifierOpeningGambitDamageBothGenerals.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericDamageFire',
];

module.exports = ModifierOpeningGambitDamageBothGenerals;
