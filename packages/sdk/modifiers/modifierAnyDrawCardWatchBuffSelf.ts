/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('@duelyst/sdk/cards/cardType');
const Stringifiers = require('@duelyst/sdk/helpers/stringifiers');

const i18next = require('i18next');
const ModifierAnyDrawCardWatch = require('./modifierAnyDrawCardWatch');
const Modifier = require('./modifier');

class ModifierAnyDrawCardWatchBuffSelf extends ModifierAnyDrawCardWatch {
  declare type: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierAnyDrawCardWatchBuffSelf';

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
        appliedName: i18next.t('modifiers.any_draw_card_watch_buff_self_applied'),
        description: Stringifiers.stringifyAttackHealthBuff(attackBuff, maxHPBuff),
      }),
    ];
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      const subContextObject = modifierContextObject.modifiersContextObjects[0];
      return i18next.t('modifiers.any_draw_card_watch_buff_self_def', {
        amount: Stringifiers.stringifyAttackHealthBuff(
          subContextObject.attributeBuffs.atk,
          subContextObject.attributeBuffs.maxHP,
        ),
      });
      // return @description.replace /%X/, Stringifiers.stringifyAttackHealthBuff(subContextObject.attributeBuffs.atk,subContextObject.attributeBuffs.maxHP)
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
ModifierAnyDrawCardWatchBuffSelf.prototype.type = 'ModifierAnyDrawCardWatchBuffSelf';
ModifierAnyDrawCardWatchBuffSelf.modifierName = i18next.t(
  'modifiers.any_draw_card_watch_buff_self_name',
);
ModifierAnyDrawCardWatchBuffSelf.description = i18next.t(
  'modifiers.any_draw_card_watch_buff_self_def',
);
ModifierAnyDrawCardWatchBuffSelf.prototype.fxResource = [
  'FX.Modifiers.ModifierDrawCardWatch',
  'FX.Modifiers.ModifierGenericBuff',
];

module.exports = ModifierAnyDrawCardWatchBuffSelf;
