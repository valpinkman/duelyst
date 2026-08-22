/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');

const i18next = require('i18next');
const ModifierHealWatch = require('./modifierHealWatch');
const Modifier = require('./modifier');

class ModifierHealWatchBuffSelf extends ModifierHealWatch {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierHealWatchBuffSelf';

  static createContextObject(attackBuff, maxHPBuff, options) {
    if (attackBuff == null) {
      attackBuff = 0;
    }
    if (maxHPBuff == null) {
      maxHPBuff = 0;
    }
    const contextObject = super.createContextObject(options);
    const statsBuff = Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff);
    statsBuff.appliedName = i18next.t('modifiers.healwatch_bufself_applied_name');
    contextObject.modifiersContextObjects = [statsBuff];
    return contextObject;
  }

  onHealWatch(action) {
    return this.applyManagedModifiersFromModifiersContextObjects(
      this.modifiersContextObjects,
      this.getCard(),
    );
  }
}
ModifierHealWatchBuffSelf.prototype.type = 'ModifierHealWatchBuffSelf';
ModifierHealWatchBuffSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierHealWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierHealWatchBuffSelf;
