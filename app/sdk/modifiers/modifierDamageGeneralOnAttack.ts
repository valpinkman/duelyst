/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Modifier = require('./modifier');
const ModifierDealDamageWatch = require('./modifierDealDamageWatch');

class ModifierDamageGeneralOnAttack extends ModifierDealDamageWatch {
  declare type: any;
  declare enemyOnly: any;
  declare fxResource: any;

  static type = 'ModifierDamageGeneralOnAttack';
  static modifierName = 'Damaging Attacks';
  static description = 'Whenever this damages an enemy minion, deal %X damage to the enemy General';

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
      return this.description.replace(/%X/, modifierContextObject.damageAmount);
    }
    return this.description;
  }

  onDealDamage(action) {
    const opponentGeneral = this.getGameSession().getGeneralForOpponentOfPlayerId(
      this.getCard().getOwnerId(),
    );
    if (action.getTarget() !== opponentGeneral) {
      // if not attacking the enemy general
      // then damage the enemy general as well
      // we can't use an attack action here in case the general has strikeback
      const damageAction = this.getCard().getGameSession().createActionForType(DamageAction.type);
      damageAction.setSource(this.getCard());
      damageAction.setTarget(opponentGeneral);
      damageAction.setDamageAmount(this.damageAmount);
      return this.getCard().getGameSession().executeAction(damageAction);
    }
  }
}
ModifierDamageGeneralOnAttack.prototype.type = 'ModifierDamageGeneralOnAttack';
ModifierDamageGeneralOnAttack.prototype.enemyOnly = true;
ModifierDamageGeneralOnAttack.prototype.fxResource = ['FX.Modifiers.ModifierDamageGeneralOnAttack'];

module.exports = ModifierDamageGeneralOnAttack;
