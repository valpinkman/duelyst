/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const DrawCardAction = require('app/sdk/actions/drawCardAction');
const ModifierOpeningGambit = require('app/sdk/modifiers/modifierOpeningGambit');

class ModifierOpeningGambitDrawCard extends ModifierOpeningGambit {
  static type = 'ModifierOpeningGambitDrawCard';

  static createContextObject(numCards, options) {
    if (numCards == null) { numCards = 1; }
    const contextObject = super.createContextObject(options);
    contextObject.numCards = numCards;
    return contextObject;
  }

  onOpeningGambit() {
    return __range__(0, this.numCards, false).map((i) =>
      this.getGameSession().executeAction(new DrawCardAction(this.getGameSession(), this.getCard().getOwnerId())));
  }
}
ModifierOpeningGambitDrawCard.prototype.type = 'ModifierOpeningGambitDrawCard';
ModifierOpeningGambitDrawCard.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit'];
ModifierOpeningGambitDrawCard.prototype.numCards = 1;

module.exports = ModifierOpeningGambitDrawCard;

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
