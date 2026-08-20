/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const HealAction = require('app/sdk/actions/healAction');
const ModifierDeathWatch = require('./modifierDeathWatch');
const Modifier = require('./modifier');

class ModifierDeathWatchGainAttackEqualToEnemyAttack extends ModifierDeathWatch {
  declare type: any;
  declare damageAmount: any;
  declare fxResource: any;

  static type = 'ModifierDeathWatchGainAttackEqualToEnemyAttack';
  static modifierName = 'Deathwatch';
  static description = 'When an enemy minion dies, gain attack equal to its attack';

  static createContextObject(options) {
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  onDeathWatch(action) {
    // if the target is an enemy minion
    if (action.getTarget().getOwnerId() !== this.getCard().getOwnerId()) {
      const atkBuff = action.getTarget().getATK();
      const statContextObject = Modifier.createContextObjectWithAttributeBuffs(atkBuff, 0);
      statContextObject.appliedName = 'Upgraded module';
      return this.getGameSession().applyModifierContextObject(statContextObject, this.getCard());
    }
  }
}
ModifierDeathWatchGainAttackEqualToEnemyAttack.prototype.type =
  'ModifierDeathWatchGainAttackEqualToEnemyAttack';
ModifierDeathWatchGainAttackEqualToEnemyAttack.prototype.damageAmount = 0;
ModifierDeathWatchGainAttackEqualToEnemyAttack.prototype.fxResource = [
  'FX.Modifiers.ModifierDeathwatch',
  'FX.Modifiers.ModifierGenericChain',
];

module.exports = ModifierDeathWatchGainAttackEqualToEnemyAttack;
