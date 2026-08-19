/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierRanged extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare attributeBuffs: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierRanged';
  static isKeyworded = true;
  static description = null;
}
ModifierRanged.prototype.type = 'ModifierRanged';
ModifierRanged.keywordDefinition = i18next.t('modifiers.ranged_def');
ModifierRanged.prototype.maxStacks = 1;
ModifierRanged.modifierName = i18next.t('modifiers.ranged_name');
ModifierRanged.prototype.attributeBuffs = { reach: CONFIG.REACH_RANGED - CONFIG.REACH_MELEE };
ModifierRanged.prototype.fxResource = ['FX.Modifiers.ModifierRanged'];

module.exports = ModifierRanged;
