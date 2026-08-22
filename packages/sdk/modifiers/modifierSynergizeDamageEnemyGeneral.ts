/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const ModifierSynergize = require('./modifierSynergize');

class ModifierSynergizeDamageEnemyGeneral extends ModifierSynergize {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierSynergizeDamageEnemyGeneral';
  static description = 'Deal %X damage to the enemy General';

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

  onSynergize(action) {
    super.onSynergize(action);

    const damageAction = new DamageAction(this.getCard().getGameSession());
    damageAction.setOwnerId(this.getCard().getOwnerId());
    damageAction.setTarget(
      this.getGameSession().getGeneralForOpponentOfPlayerId(this.getCard().getOwnerId()),
    );
    damageAction.setDamageAmount(this.damageAmount);
    return this.getGameSession().executeAction(damageAction);
  }
}
ModifierSynergizeDamageEnemyGeneral.prototype.type = 'ModifierSynergizeDamageEnemyGeneral';
ModifierSynergizeDamageEnemyGeneral.prototype.damageAmount = 0;
ModifierSynergizeDamageEnemyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierSpellWatch',
  'FX.Modifiers.ModifierGenericDamage',
];

module.exports = ModifierSynergizeDamageEnemyGeneral;
