/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const ModifierMyGeneralDamagedWatch = require('./modifierMyGeneralDamagedWatch');
const Modifier = require('./modifier');

class ModifierMyGeneralDamagedWatchBuffSelf extends ModifierMyGeneralDamagedWatch {
  declare type: any;

  static type = 'ModifierMyGeneralDamagedWatchBuffSelf';
  static modifierName = 'My General Damaged Watch';
  static description = 'Whenever your General takes damage, this minion gains %X';

  static createContextObject(attackBuff, maxHPBuff, options) {
    if (attackBuff == null) { attackBuff = 0; }
    if (maxHPBuff == null) { maxHPBuff = 0; }
    const contextObject = super.createContextObject(options);
    const statContextObject = Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff);
    statContextObject.appliedName = 'Vengeful Rage';
    contextObject.modifiersContextObjects = [statContextObject];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const subContextObject = modifierContextObject.modifiersContextObjects[0];
      return this.description.replace(/%X/, Stringifiers.stringifyAttackHealthBuff(subContextObject.attributeBuffs.atk, subContextObject.attributeBuffs.maxHP));
    }
    return this.description;
  }

  onDamageDealtToGeneral(action) {
    return this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
  }
}
ModifierMyGeneralDamagedWatchBuffSelf.prototype.type = 'ModifierMyGeneralDamagedWatchBuffSelf';

module.exports = ModifierMyGeneralDamagedWatchBuffSelf;
