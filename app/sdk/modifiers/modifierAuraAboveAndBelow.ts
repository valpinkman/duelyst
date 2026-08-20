/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const i18next = require('i18next');
const Modifier = require('./modifier');

class ModifierAuraAboveAndBelow extends Modifier {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierAuraAboveAndBelow';

  _findPotentialCardsInAura() {
    const finalFilteredCards = [];
    const potentialCards = super._findPotentialCardsInAura();

    const general = this.getGameSession().getGeneralForPlayerId(this.getCard().getOwnerId());
    const generalPosition = general.getPosition();

    for (var card of Array.from<any>(potentialCards)) {
      var entityPosition = card.getPosition();
      if (
        Math.abs(entityPosition.x - generalPosition.x) === 0 &&
        Math.abs(entityPosition.y - generalPosition.y) <= 1
      ) {
        finalFilteredCards.push(card);
      }
    }
    return finalFilteredCards;
  }
}
ModifierAuraAboveAndBelow.prototype.type = 'ModifierAuraAboveAndBelow';
ModifierAuraAboveAndBelow.prototype.fxResource = ['FX.Modifiers.ModifierAuraAboveAndBelow'];

module.exports = ModifierAuraAboveAndBelow;
