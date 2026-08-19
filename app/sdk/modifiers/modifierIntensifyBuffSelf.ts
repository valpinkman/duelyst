/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierIntensify = require('./modifierIntensify');
const Modifier = require('./modifier');

class ModifierIntensifyBuffSelf extends ModifierIntensify {
  declare type: any;
  declare attackBuff: any;
  declare healthBuff: any;
  declare modifierName: any;

  static type = 'ModifierIntensifyBuffSelf';

  static createContextObject(attackBuff, healthBuff, modifierName, options) {
    const contextObject = super.createContextObject(options);
    contextObject.attackBuff = attackBuff;
    contextObject.healthBuff = healthBuff;
    contextObject.modifierName = modifierName;
    return contextObject;
  }

  onIntensify() {
    const totalAttackBuff = this.getIntensifyAmount() * this.attackBuff;
    const totalHealthBuff = this.getIntensifyAmount() * this.healthBuff;

    const statContextObject = Modifier.createContextObjectWithAttributeBuffs(totalAttackBuff, totalHealthBuff);
    statContextObject.appliedName = this.modifierName;
    return this.getGameSession().applyModifierContextObject(statContextObject, this.getCard());
  }
}
ModifierIntensifyBuffSelf.prototype.type = 'ModifierIntensifyBuffSelf';
ModifierIntensifyBuffSelf.prototype.attackBuff = 0;
ModifierIntensifyBuffSelf.prototype.healthBuff = 0;
ModifierIntensifyBuffSelf.prototype.modifierName = null;

module.exports = ModifierIntensifyBuffSelf;
