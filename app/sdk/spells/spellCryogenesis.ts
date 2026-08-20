/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const SpellDamage = require('./spellDamage');
const CardType = require('app/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');
const Races = require('app/sdk/cards/racesLookup');

class SpellCryogenesis extends SpellDamage {
  declare targetType: any;
  declare spellFilterType: any;

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    let cardIndex;
    super.onApplyEffectToBoardTile(board, x, y, sourceAction);

    // draw a frost minion
    // calculate card to draw only on the server, since only the server knows contents of both decks
    const deck = this.getOwner().getDeck();
    const drawPile = deck.getDrawPile();
    const indexesOfMinions = [];
    for (let i = 0; i < drawPile.length; i++) {
      // find only frost minions
      cardIndex = drawPile[i];
      var card = this.getGameSession().getCardByIndex(cardIndex);
      if (
        card != null &&
        card.getType() === CardType.Unit &&
        card.getBelongsToTribe(Races.Vespyr)
      ) {
        indexesOfMinions.push(i);
      }
    }

    if (indexesOfMinions.length > 0) {
      const indexOfCardInDeck =
        indexesOfMinions[
          this.getGameSession().getRandomIntegerForExecution(indexesOfMinions.length)
        ];
      cardIndex = drawPile[indexOfCardInDeck];
      const drawCardAction = this.getGameSession()
        .getPlayerById(this.getOwner().getPlayerId())
        .getDeck()
        .actionDrawCard(cardIndex);
      return this.getGameSession().executeAction(drawCardAction);
    }
  }
}
SpellCryogenesis.prototype.targetType = CardType.Unit;
SpellCryogenesis.prototype.spellFilterType = SpellFilterType.EnemyDirect;

module.exports = SpellCryogenesis;
