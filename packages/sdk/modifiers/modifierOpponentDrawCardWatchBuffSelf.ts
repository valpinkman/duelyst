/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');
const ModifierOpponentDrawCardWatch = require('./modifierOpponentDrawCardWatch');
const Modifier = require('./modifier');

class ModifierOpponentDrawCardWatchBuffSelf extends ModifierOpponentDrawCardWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpponentDrawCardWatchBuffSelf';
  static modifierName = 'ModifierOpponentDrawCardWatchBuffSelf';
  static description = 'Whenever your opponent draws a card, this minion gains %X';

  static createContextObject(attackBuff, maxHPBuff, options) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (maxHPBuff == null) {
      maxHPBuff = 0;
    }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = [
      Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff, {
        modifierName: this.modifierName,
        appliedName: 'Vindicated!',
        description: Stringifiers.stringifyAttackHealthBuff(attackBuff, maxHPBuff),
      }),
    ];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const subContextObject = modifierContextObject.modifiersContextObjects[0];
      return this.description.replace(
        /%X/,
        Stringifiers.stringifyAttackHealthBuff(
          subContextObject.attributeBuffs.atk,
          subContextObject.attributeBuffs.maxHP,
        ),
      );
    }
    return this.description;
  }

  onDrawCardWatch(action) {
    return this.applyManagedModifiersFromModifiersContextObjects(
      this.modifiersContextObjects,
      this.getCard(),
    );
  }
}
ModifierOpponentDrawCardWatchBuffSelf.prototype.type = 'ModifierOpponentDrawCardWatchBuffSelf';
ModifierOpponentDrawCardWatchBuffSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierOpponentDrawCardWatchBuffSelf',
  'FX.Modifiers.ModifierGenericDamage',
];

module.exports = ModifierOpponentDrawCardWatchBuffSelf;
