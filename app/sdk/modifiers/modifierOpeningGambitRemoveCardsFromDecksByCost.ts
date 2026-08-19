/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveCardFromDeckAction = require('app/sdk/actions/removeCardFromDeckAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitRemoveCardsFromDecksByCost extends ModifierOpeningGambit {
  declare type: any;
  declare manaCost: any;
  declare affectMyDeck: any;
  declare affectOppDeck: any;

  static type = 'ModifierOpeningGambitRemoveCardsFromDecksByCost';

  static createContextObject(manaCost, affectMyDeck, affectOppDeck, options) {
    if (affectMyDeck == null) { affectMyDeck = true; }
    if (affectOppDeck == null) { affectOppDeck = true; }
    const contextObject = super.createContextObject();
    contextObject.manaCost = manaCost;
    contextObject.affectMyDeck = affectMyDeck;
    contextObject.affectOppDeck = affectOppDeck;

    return contextObject;
  }

  onOpeningGambit() {
    if (this.manaCost != null) {
      let cardAtIndex; let cardIndex; let i; let
        removeCardFromDeckAction;
      if (this.affectMyDeck) {
        const myDrawPile = this.getOwner().getDeck().getDrawPile();
        for (i = 0; i < myDrawPile.length; i++) {
          cardIndex = myDrawPile[i];
          cardAtIndex = this.getGameSession().getCardByIndex(cardIndex);
          if (((cardAtIndex != null ? cardAtIndex.getManaCost() : undefined) <= this.manaCost) && (cardAtIndex.getType() === CardType.Unit)) {
            removeCardFromDeckAction = new RemoveCardFromDeckAction(this.getGameSession(), cardAtIndex.getIndex(), this.getOwner().getPlayerId());
            this.getGameSession().executeAction(removeCardFromDeckAction);
          }
        }
      }

      if (this.affectOppDeck) {
        const opponent = this.getGameSession().getOpponentPlayerOfPlayerId(this.getCard().getOwnerId());
        const opponentDrawPile = opponent.getDeck().getDrawPile();
        return (() => {
          const result = [];
          for (i = 0; i < opponentDrawPile.length; i++) {
            cardIndex = opponentDrawPile[i];
            cardAtIndex = this.getGameSession().getCardByIndex(cardIndex);
            if (((cardAtIndex != null ? cardAtIndex.getManaCost() : undefined) <= this.manaCost) && (cardAtIndex.getType() === CardType.Unit)) {
              removeCardFromDeckAction = new RemoveCardFromDeckAction(this.getGameSession(), cardAtIndex.getIndex(), opponent.getPlayerId());
              result.push(this.getGameSession().executeAction(removeCardFromDeckAction));
            } else {
              result.push(undefined);
            }
          }
          return result;
        })();
      }
    }
  }
}
ModifierOpeningGambitRemoveCardsFromDecksByCost.prototype.type = 'ModifierOpeningGambitRemoveCardsFromDecksByCost';
ModifierOpeningGambitRemoveCardsFromDecksByCost.prototype.manaCost = null;
ModifierOpeningGambitRemoveCardsFromDecksByCost.prototype.affectMyDeck = true;
ModifierOpeningGambitRemoveCardsFromDecksByCost.prototype.affectOppDeck = true;

module.exports = ModifierOpeningGambitRemoveCardsFromDecksByCost;
