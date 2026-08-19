/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const RemoveCardFromDeckAction = require('app/sdk/actions/removeCardFromDeckAction');
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const CardType = require('app/sdk/cards/cardType');

const i18next = require('i18next');
const ModifierBackstabWatch = require('./modifierBackstabWatch');

class ModifierBackstabWatchStealSpellFromDeck extends ModifierBackstabWatch {
  declare type: any;
  declare static modifierName: any;
  declare static description: any;

  static type = 'ModifierBackstabWatchStealSpellFromDeck';

  static createContextObject(options) {
    if (options == null) { options = undefined; }
    const contextObject = super.createContextObject(options);
    return contextObject;
  }

  onBackstabWatch(action) {
    const opponentPlayer = this.getGameSession().getOpponentPlayerOfPlayerId(this.getOwnerId());
    const opponentsDrawPile = opponentPlayer.getDeck().getDrawPile();

    const indicesOfOpponentSpellsInDeck = [];
    // check opponent's deck for spells
    for (let i = 0; i < opponentsDrawPile.length; i++) {
      var cardIndex = opponentsDrawPile[i];
      var card = this.getGameSession().getCardByIndex(cardIndex);
      if ((card != null) && (card.getType() === CardType.Spell)) {
        indicesOfOpponentSpellsInDeck.push(i);
      }
    }

    // get random spell from opponent's deck
    if (indicesOfOpponentSpellsInDeck.length > 0) {
      const indexOfCardInDeck = indicesOfOpponentSpellsInDeck[this.getGameSession().getRandomIntegerForExecution(indicesOfOpponentSpellsInDeck.length)];
      const opponentCardIndex = opponentsDrawPile[indexOfCardInDeck];
      const opponentCard = this.getGameSession().getCardByIndex(opponentCardIndex);

      if (opponentCard != null) {
        const myNewCardData = opponentCard.createCardData();
        myNewCardData.ownerId = this.getOwnerId(); // reset owner id to player who will receive this card
        const removeCardFromDeckAction = new RemoveCardFromDeckAction(this.getGameSession(), opponentCard.getIndex(), opponentPlayer.getPlayerId());
        this.getGameSession().executeAction(removeCardFromDeckAction);
        const putCardInHandAction = new PutCardInHandAction(this.getGameSession(), this.getOwnerId(), myNewCardData);
        return this.getGameSession().executeAction(putCardInHandAction);
      }
    }
  }
}
ModifierBackstabWatchStealSpellFromDeck.prototype.type = 'ModifierBackstabWatchStealSpellFromDeck';
ModifierBackstabWatchStealSpellFromDeck.modifierName = i18next.t('modifiers.backstab_watch_steal_spell_from_deck_name');
ModifierBackstabWatchStealSpellFromDeck.description = i18next.t('modifiers.backstab_watch_steal_spell_from_deck_def');

module.exports = ModifierBackstabWatchStealSpellFromDeck;
