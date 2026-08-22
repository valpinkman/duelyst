/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const SpellSpawnEntity = require('./spellSpawnEntity');
const CardType = require('@duelyst/sdk/cards/cardType');
const SpellFilterType = require('./spellFilterType');

class SpellMindSteal extends SpellSpawnEntity {
  declare spellFilterType: any;
  declare spawnSilently: any;

  getPrivateDefaults(gameSession) {
    const p = super.getPrivateDefaults(gameSession);

    p.canConvertCardToPrismatic = false; // stealing an actual card, so don't convert to prismatic based on this card

    return p;
  }

  onApplyEffectToBoardTile(board, x, y, sourceAction) {
    const opponentsDeck = this.getGameSession()
      .getOpponentPlayerOfPlayerId(this.getOwnerId())
      .getDeck();
    const drawPile = opponentsDeck.getDrawPile();
    const indexesOfMinions = [];
    const gameSession = this.getGameSession();
    for (let i = 0; i < drawPile.length; i++) {
      var cardIndex = drawPile[i];
      if (
        __guard__(gameSession.getCardByIndex(cardIndex), (x1) => x1.getType()) === CardType.Unit
      ) {
        indexesOfMinions.push(i);
      }
    }

    if (indexesOfMinions.length > 0) {
      const indexOfCardInDeck =
        indexesOfMinions[
          this.getGameSession().getRandomIntegerForExecution(indexesOfMinions.length)
        ];
      this.cardDataOrIndexToSpawn = drawPile[indexOfCardInDeck];

      return super.onApplyEffectToBoardTile(board, x, y, sourceAction);
    }
  }
}
SpellMindSteal.prototype.spellFilterType = SpellFilterType.SpawnSource;
SpellMindSteal.prototype.spawnSilently = true;

module.exports = SpellMindSteal;

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null ? transform(value) : undefined;
}
