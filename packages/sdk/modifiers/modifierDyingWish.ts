/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DieAction = require('@duelyst/sdk/actions/dieAction');

const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierDyingWish extends Modifier {
  declare type: any;
  declare activeInHand: any;
  declare activeInDeck: any;
  declare activeInSignatureCards: any;
  declare activeOnBoard: any;
  declare fxResource: any;
  declare static keywordDefinition: any;
  declare static modifierName: any;

  static type = 'ModifierDyingWish';
  static isKeyworded = true;
  static description = null;

  onAction(e) {
    super.onAction(e);

    const { action } = e;

    // when our entity has died
    if (
      action instanceof DieAction &&
      action.getTarget() === this.getCard() &&
      this.getCard().getIsRemoved()
    ) {
      return this.onDyingWish(action);
    }
  }

  onDyingWish(action) {}
}
ModifierDyingWish.prototype.type = 'ModifierDyingWish';
ModifierDyingWish.keywordDefinition = i18next.t('modifiers.dying_wish_def');
ModifierDyingWish.modifierName = i18next.t('modifiers.dying_wish_name');
ModifierDyingWish.prototype.activeInHand = false;
ModifierDyingWish.prototype.activeInDeck = false;
ModifierDyingWish.prototype.activeInSignatureCards = false;
ModifierDyingWish.prototype.activeOnBoard = true;
ModifierDyingWish.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish'];
// override me in sub classes to implement special behavior

module.exports = ModifierDyingWish;
