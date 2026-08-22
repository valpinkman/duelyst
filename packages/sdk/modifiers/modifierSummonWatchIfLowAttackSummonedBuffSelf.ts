/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');
const ModifierSummonWatch = require('./modifierSummonWatch');
const Modifier = require('./modifier');

class ModifierSummonWatchIfLowAttackSummonedBuffSelf extends ModifierSummonWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierSummonWatchIfLowAttackSummonedBuffSelf';
  static modifierName = 'Summon Watch';
  static description = 'Whenever you summon a minion with low attack, this minion gains a buff';
  static maxAttackTrigger = 0;

  static createContextObject(
    attackBuff,
    maxHPBuff,
    maxAttackTrigger,
    appliedModifierName = null,
    options,
  ) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (maxHPBuff == null) {
      maxHPBuff = 0;
    }
    if (maxAttackTrigger == null) {
      maxAttackTrigger = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = [
      Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff, {
        modifierName: this.modifierName,
        description: Stringifiers.stringifyAttackHealthBuff(attackBuff, maxHPBuff),
        appliedName: appliedModifierName,
      }),
    ];
    contextObject.maxAttackTrigger = maxAttackTrigger;
    return contextObject;
  }

  onSummonWatch(action?) {
    const entity = action.getTarget();
    if (entity != null) {
      if (entity.getBaseATK() <= this.maxAttackTrigger) {
        return this.applyManagedModifiersFromModifiersContextObjects(
          this.modifiersContextObjects,
          this.getCard(),
        );
      }
    }
  }
}
ModifierSummonWatchIfLowAttackSummonedBuffSelf.prototype.type =
  'ModifierSummonWatchIfLowAttackSummonedBuffSelf';
ModifierSummonWatchIfLowAttackSummonedBuffSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierSummonWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierSummonWatchIfLowAttackSummonedBuffSelf;
