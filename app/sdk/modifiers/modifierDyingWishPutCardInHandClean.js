/*
 * decaffeinate suggestions:
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierDyingWishPutCardInHand = require('./modifierDyingWishPutCardInHand');

class ModifierDyingWishPutCardInHandClean extends ModifierDyingWishPutCardInHand {
  static initClass() {
    this.prototype.type = 'ModifierDyingWishPutCardInHandClean';
    this.type = 'ModifierDyingWishPutCardInHandClean';

    this.isKeyworded = false;
    this.modifierName = undefined;
    this.description = i18next.t('modifiers.faction_6_infiltrated_replicate_buff_desc');
  }

  static getDescription(modifierContextObject) {
    return this.description;
  }
}
ModifierDyingWishPutCardInHandClean.initClass();

module.exports = ModifierDyingWishPutCardInHandClean;
