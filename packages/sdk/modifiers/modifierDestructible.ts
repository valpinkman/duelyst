/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const i18next = require('i18next');
const Modifier = require('./modifier');

/*
  Destructible is a special modifier used to explain artifacts via keyword popout.
*/
class ModifierDestructible extends Modifier {
  declare type: any;
  declare maxStacks: any;
  declare static modifierName: any;
  declare static keywordDefinition: any;

  static type = 'ModifierDestructible';
  static description = null;
  static isHiddenToUI = true;
  static isKeyworded = true;
}
ModifierDestructible.prototype.type = 'ModifierDestructible';
ModifierDestructible.modifierName = i18next.t('modifiers.destructible_name');
ModifierDestructible.keywordDefinition = i18next.t('modifiers.destructible_def');
ModifierDestructible.prototype.maxStacks = 1;

module.exports = ModifierDestructible;
