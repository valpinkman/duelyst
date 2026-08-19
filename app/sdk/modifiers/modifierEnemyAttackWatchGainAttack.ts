/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierEnemyAttackWatch = require('./modifierEnemyAttackWatch');
const Modifier = require('./modifier');

class ModifierEnemyAttackWatchGainAttack extends ModifierEnemyAttackWatch {
  declare type: any;
  declare attackBuff: any;
  declare buffName: any;

  static type = 'ModifierEnemyAttackWatchGainAttack';

  static createContextObject(attackBuff, buffName, options) {
    if (attackBuff == null) { attackBuff = 0; }
    const contextObject = super.createContextObject(options);
    contextObject.attackBuff = attackBuff;
    contextObject.buffName = buffName;
    return contextObject;
  }

  onEnemyAttackWatch(action) {
    const target = action.getTarget();
    if ((target != null) && (target === this.getCard())) {
      const statContextObject = Modifier.createContextObjectWithAttributeBuffs(this.attackBuff);
      statContextObject.appliedName = this.buffName;
      return this.getGameSession().applyModifierContextObject(statContextObject, this.getCard());
    }
  }
}
ModifierEnemyAttackWatchGainAttack.prototype.type = 'ModifierEnemyAttackWatchGainAttack';
ModifierEnemyAttackWatchGainAttack.prototype.attackBuff = 0;
ModifierEnemyAttackWatchGainAttack.prototype.buffName = null;

module.exports = ModifierEnemyAttackWatchGainAttack;
