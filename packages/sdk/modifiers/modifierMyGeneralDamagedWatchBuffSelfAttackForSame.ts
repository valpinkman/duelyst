/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DamageAction = require('@duelyst/sdk/actions/damageAction');
const Modifier = require('./modifier');
const ModifierMyGeneralDamagedWatch = require('./modifierMyGeneralDamagedWatch');

class ModifierMyGeneralDamagedWatchBuffSelfAttackForSame extends ModifierMyGeneralDamagedWatch {
  declare type: any;

  static type = 'ModifierMyGeneralDamagedWatchBuffSelfAttackForSame';
  static modifierName = 'My General Damaged Watch';
  static description = 'Whenever your General takes damage, this minion gains that much Attack';

  static createContextObject(modifierAppliedName, options) {
    const contextObject = super.createContextObject(options);
    contextObject.modifierAppliedName = modifierAppliedName;
    return contextObject;
  }

  onDamageDealtToGeneral(action) {
    const modifierContextObject = Modifier.createContextObjectWithAttributeBuffs(
      action.getTotalDamageAmount(),
    );
    modifierContextObject.appliedName = this.modifierAppliedName;
    return this.getGameSession().applyModifierContextObject(
      modifierContextObject,
      this.getCard(),
      this,
    );
  }
}
ModifierMyGeneralDamagedWatchBuffSelfAttackForSame.prototype.type =
  'ModifierMyGeneralDamagedWatchBuffSelfAttackForSame';

module.exports = ModifierMyGeneralDamagedWatchBuffSelfAttackForSame;
