/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierToken extends Modifier {
  static initClass() {
    this.prototype.type = 'ModifierToken';
    this.type = 'ModifierToken';

    this.isKeyworded = true;
    this.keywordDefinition = 'Card not collectible';

    this.modifierName = 'Token';

    this.prototype.isRemovable = false;
  }
}
ModifierToken.initClass();

module.exports = ModifierToken;
