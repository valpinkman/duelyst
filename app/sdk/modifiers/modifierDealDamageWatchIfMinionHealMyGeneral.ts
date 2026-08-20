/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierDealDamageWatchHealMyGeneral = require('./modifierDealDamageWatchHealMyGeneral');

class ModifierDealDamageWatchIfMinionHealMyGeneral extends ModifierDealDamageWatchHealMyGeneral {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierDealDamageWatchIfMinionHealMyGeneral';
  static modifierName = 'Deal Damage Watch';
  static description =
    'Whenever this minion deals damage to a minion, restore Health to your General';

  onDealDamage(action) {
    const target = action.getTarget();
    if (target != null && !target.getIsGeneral()) {
      return super.onDealDamage(action);
    }
  }
}
ModifierDealDamageWatchIfMinionHealMyGeneral.prototype.type =
  'ModifierDealDamageWatchIfMinionHealMyGeneral';
ModifierDealDamageWatchIfMinionHealMyGeneral.prototype.fxResource = [
  'FX.Modifiers.ModifierDealDamageWatch',
  'FX.Modifiers.ModifierGenericHeal',
];

module.exports = ModifierDealDamageWatchIfMinionHealMyGeneral;
