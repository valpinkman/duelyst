/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierToken extends Modifier {
  static type = 'ModifierToken';
  static isKeyworded = true;
  static keywordDefinition = 'Card not collectible';
  static modifierName = 'Token';
}
ModifierToken.prototype.type = 'ModifierToken';
ModifierToken.prototype.isRemovable = false;

module.exports = ModifierToken;
