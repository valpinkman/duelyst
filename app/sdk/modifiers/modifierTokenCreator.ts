/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierTokenCreator extends Modifier {
  declare type: any;
  declare isRemovable: any;

  static type = 'ModifierTokenCreator';
  static isHiddenToUI = true;
  static modifierName = 'Token';
}
ModifierTokenCreator.prototype.type = 'ModifierTokenCreator';
ModifierTokenCreator.prototype.isRemovable = false;

module.exports = ModifierTokenCreator;
