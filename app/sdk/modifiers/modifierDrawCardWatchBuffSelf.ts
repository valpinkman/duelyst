/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const Stringifiers = require('app/sdk/helpers/stringifiers');
const i18next = require('i18next');
const ModifierDrawCardWatch = require('./modifierDrawCardWatch');
const Modifier = require('./modifier');

class ModifierDrawCardWatchBuffSelf extends ModifierDrawCardWatch {
  declare type: any;
  declare fxResource: any;
  declare static description: any;

  static type = 'ModifierDrawCardWatchBuffSelf';
  static modifierName = 'Draw Card Watch';

  static createContextObject(attackBuff, maxHPBuff, options) {
    if (attackBuff == null) { attackBuff = 0; }
    if (maxHPBuff == null) { maxHPBuff = 0; }
    const contextObject = super.createContextObject(options);
    contextObject.modifiersContextObjects = [
      Modifier.createContextObjectWithAttributeBuffs(attackBuff, maxHPBuff, {
        modifierName: this.modifierName,
        appliedName: i18next.t('modifiers.draw_card_watch_buff_self_name'),
        description: Stringifiers.stringifyAttackHealthBuff(attackBuff, maxHPBuff),
      }),
    ];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const subContextObject = modifierContextObject.modifiersContextObjects[0];
      return i18next.t('modifiers.draw_card_watch_buff_self_def', { buff: Stringifiers.stringifyAttackHealthBuff(subContextObject.attributeBuffs.atk, subContextObject.attributeBuffs.maxHP) });
      // return @description.replace /%X/, Stringifiers.stringifyAttackHealthBuff(subContextObject.attributeBuffs.atk,subContextObject.attributeBuffs.maxHP)
    }
    return this.description;
  }

  onDrawCardWatch(action) {
    return this.applyManagedModifiersFromModifiersContextObjects(this.modifiersContextObjects, this.getCard());
  }
}
ModifierDrawCardWatchBuffSelf.prototype.type = 'ModifierDrawCardWatchBuffSelf';
ModifierDrawCardWatchBuffSelf.description = i18next.t('modifiers.draw_card_watch_buff_self_def');
ModifierDrawCardWatchBuffSelf.prototype.fxResource = ['FX.Modifiers.ModifierDrawCardWatch', 'FX.Modifiers.ModifierGenericBuff'];

module.exports = ModifierDrawCardWatchBuffSelf;
