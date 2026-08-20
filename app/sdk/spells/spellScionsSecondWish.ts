/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const Spell = require('./spell');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const Factions = require('app/sdk/cards/factionsLookup');

class SpellScionsSecondWish extends Spell {
  declare targetType: any;
  declare spellFilterType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    let cardIndex;
    let i;
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    // draw 2 Vetruvian cards
    const deck = this.getOwner().getDeck();
    const drawPile = deck.getDrawPile();
    const indexOfCards = [];
    for (i = 0; i < drawPile.length; i++) {
      cardIndex = drawPile[i];
      var card = this.getGameSession().getCardByIndex(cardIndex);
      if (card != null && card.getFactionId() === Factions.Faction3) {
        indexOfCards.push(i);
      }
    }

    return (() => {
      const result = [];
      for (i = 0; i < 2; i++) {
        if (indexOfCards.length > 0) {
          var whichCard = this.getGameSession().getRandomIntegerForExecution(indexOfCards.length);
          var indexOfCardInDeck = indexOfCards[whichCard];
          cardIndex = drawPile[indexOfCardInDeck];
          indexOfCards.splice(whichCard, 1); // remove this card from the list (don't try to draw same card twice)
          // put card in hand
          var putCardInHandAction = new PutCardInHandAction(
            this.getGameSession(),
            this.getOwnerId(),
            cardIndex,
          );
          result.push(this.getGameSession().executeAction(putCardInHandAction));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }
}
SpellScionsSecondWish.prototype.targetType = CardType.Unit;
SpellScionsSecondWish.prototype.spellFilterType = SpellFilterType.EnemyDirect;

module.exports = SpellScionsSecondWish;
