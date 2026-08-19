/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const ModifierManaCostChange = require('app/sdk/modifiers/modifierManaCostChange');
const _ = require('underscore');
const ModifierDyingWish = require('./modifierDyingWish');

class ModifierDyingWishReduceManaCostOfDyingWish extends ModifierDyingWish {
  declare type: any;
  declare fxResource: any;
  declare reduceAmount: any;

  static type = 'ModifierDyingWishReduceManaCostOfDyingWish';

  static createContextObject(reduceAmount, options) {
    const contextObject = super.createContextObject(options);
    contextObject.reduceAmount = reduceAmount;
    return contextObject;
  }

  onDyingWish() {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      let cards = [];
      const deck = this.getOwner().getDeck();
      cards = cards.concat(deck.getCardsInHandExcludingMissing(), deck.getCardsInDrawPile());
      return (() => {
        const result = [];
        for (var card of Array.from<any>(cards)) {
        // search for Dying Wish modifier and keyword class Dying Wish
        // searching by keyword class because some units have "dying wishes" that are not specified as Dying Wish keyword
        // (ex - Snow Chaser 'replicate')
        // but don't want to catch minions that grant others Dying Wish (ex - Ancient Grove)
          if (card.hasModifierClass(ModifierDyingWish)) {
            result.push((() => {
              const result1 = [];
              for (var kwClass of Array.from<any>(card.getKeywordClasses())) {
                if (kwClass.belongsToKeywordClass(ModifierDyingWish)) {
                  var manaModifier = ModifierManaCostChange.createContextObject(this.reduceAmount * -1);
                  this.getGameSession().applyModifierContextObject(manaModifier, card);
                  break;
                } else {
                  result1.push(undefined);
                }
              }
              return result1;
            })());
          } else {
            result.push(undefined);
          }
        }
        return result;
      })();
    }
  }
}
ModifierDyingWishReduceManaCostOfDyingWish.prototype.type = 'ModifierDyingWishReduceManaCostOfDyingWish';
ModifierDyingWishReduceManaCostOfDyingWish.prototype.fxResource = ['FX.Modifiers.ModifierDyingWish'];
ModifierDyingWishReduceManaCostOfDyingWish.prototype.reduceAmount = 0;

module.exports = ModifierDyingWishReduceManaCostOfDyingWish;
