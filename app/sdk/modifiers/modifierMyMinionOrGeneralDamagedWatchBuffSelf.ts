/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('app/sdk/actions/damageAction');
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const ModifierMyMinionOrGeneralDamagedWatch = require('./modifierMyMinionOrGeneralDamagedWatch');
const Modifier = require('./modifier');

class ModifierMyMinionOrGeneralDamagedWatchBuffSelf extends ModifierMyMinionOrGeneralDamagedWatch {
  declare type: any;

  static type = 'ModifierMyMinionOrGeneralDamagedWatchBuffSelf';
  static modifierName = 'My Minion or General Damaged Watch';
  static description = 'Each time a friendly minion or your General takes damage, gain %X';

  static createContextObject(attackBuff, maxHPBuff, options) {
    if (attackBuff == null) { attackBuff = 0; }
    if (maxHPBuff == null) { maxHPBuff = 0; }
    const contextObject = super.createContextObject(options);
    const statContextObject = Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff);
    statContextObject.appliedName = 'Protector\'s Rage';
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

  onDamageDealtToMinionOrGeneral(action) {
    return this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
  }
}
ModifierMyMinionOrGeneralDamagedWatchBuffSelf.prototype.type = 'ModifierMyMinionOrGeneralDamagedWatchBuffSelf';

module.exports = ModifierMyMinionOrGeneralDamagedWatchBuffSelf;
