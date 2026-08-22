/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierFlying extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare attributeBuffs: any;
  declare fxResource: any;
  declare static modifierName: any;
  declare static keywordDefinition: any;

  static type = 'ModifierFlying';
  static isKeyworded = true;
  static description = null;
}
ModifierFlying.prototype.type = 'ModifierFlying';
ModifierFlying.modifierName = i18next.t('modifiers.flying_name');
ModifierFlying.keywordDefinition = i18next.t('modifiers.flying_def');
ModifierFlying.prototype.maxStacks = 1;
ModifierFlying.prototype.attributeBuffs = { speed: CONFIG.SPEED_INFINITE };
ModifierFlying.prototype.fxResource = ['FX.Modifiers.ModifierFlying'];

module.exports = ModifierFlying;
