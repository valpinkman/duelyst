/*
 * decaffeinate suggestions:
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const ModifierDyingWishPutCardInHand = require('./modifierDyingWishPutCardInHand');

class ModifierDyingWishPutCardInHandClean extends ModifierDyingWishPutCardInHand {
  declare type: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierDyingWishPutCardInHandClean';
  static isKeyworded = false;

  static getDescription(modifierContextObject) {
    return this.description;
  }
}
ModifierDyingWishPutCardInHandClean.prototype.type = 'ModifierDyingWishPutCardInHandClean';
ModifierDyingWishPutCardInHandClean.modifierName = undefined;
ModifierDyingWishPutCardInHandClean.description = i18next.t('modifiers.faction_6_infiltrated_replicate_buff_desc');

module.exports = ModifierDyingWishPutCardInHandClean;
