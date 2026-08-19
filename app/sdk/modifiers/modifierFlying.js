/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierFlying extends Modifier {
  static initClass() {
    this.prototype.type = 'ModifierFlying';
    this.type = 'ModifierFlying';

    this.isKeyworded = true;
    this.modifierName = i18next.t('modifiers.flying_name');
    this.description = null;
    this.keywordDefinition = i18next.t('modifiers.flying_def');

    this.prototype.maxStacks = 1;

    this.prototype.attributeBuffs = { speed: CONFIG.SPEED_INFINITE };

    this.prototype.fxResource = ['FX.Modifiers.ModifierFlying'];
  }
}
ModifierFlying.initClass();

module.exports = ModifierFlying;
