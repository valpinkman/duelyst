/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PutCardInHandAction = require('app/sdk/actions/putCardInHandAction');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const CardType = require('app/sdk/cards/cardType');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const Cards = require('app/sdk/cards/cardsLookupComplete');
const CONFIG = require('app/common/config');
const ModifierBackstab = require('./modifierBackstab');
const ModifierBackstabWatch = require('./modifierBackstabWatch');

class ModifierBackstabWatchSummonBackstabMinion extends ModifierBackstabWatch {
  declare type: any;
  declare cardToAdd: any;
  declare numToAdd: any;

  static type = 'ModifierBackstabWatchSummonBackstabMinion';

  static createContextObject(backstabManaCost, options) {
    const contextObject = super.createContextObject(options);
    contextObject.backstabManaCost = backstabManaCost;
    return contextObject;
  }

  onBackstabWatch(action) {
    let card; let
      i;
    let asc; let
      end;
    for (i = 0, end = this.numToAdd, asc = end >= 0; asc ? i < end : i > end; asc ? i++ : i--) {
      var putCardInHandAction = new PutCardInHandAction(this.getGameSession(), this.getOwnerId(), this.cardToAdd);
      this.getGameSession().executeAction(putCardInHandAction);
    }

    const deck = this.getOwner().getDeck();
    const drawPile = deck.getDrawPile();
    const indexesOfMinions = [];
    for (i = 0; i < drawPile.length; i++) {
      // find only frost minions
      var cardIndex = drawPile[i];
      card = this.getGameSession().getCardByIndex(cardIndex);
      if ((card != null) && (card.getType() === CardType.Unit) && (card.getManaCost() <= this.backstabManaCost) && card.hasModifierClass(ModifierBackstab)) {
        indexesOfMinions.push(i);
      }
    }

    if (indexesOfMinions.length > 0) {
      const indexOfCardInDeck = indexesOfMinions[this.getGameSession().getRandomIntegerForExecution(indexesOfMinions.length)];
      const cardIndexToDraw = drawPile[indexOfCardInDeck];
      card = this.getGameSession().getCardByIndex(cardIndexToDraw);

      let spawnLocation = null;
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(this.getGameSession(), this.getCard().getPosition(), CONFIG.PATTERN_3x3, card);
      if ((validSpawnLocations != null ? validSpawnLocations.length : undefined) > 0) {
        spawnLocation = validSpawnLocations[this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length)];

        if (spawnLocation != null) {
          const playCardAction = new PlayCardSilentlyAction(this.getGameSession(), this.getCard().getOwnerId(), spawnLocation.x, spawnLocation.y, card);
          playCardAction.setSource(this.getCard());
          return this.getGameSession().executeAction(playCardAction);
        }
      }
    }
  }
}
ModifierBackstabWatchSummonBackstabMinion.prototype.type = 'ModifierBackstabWatchSummonBackstabMinion';
ModifierBackstabWatchSummonBackstabMinion.prototype.cardToAdd = null;
ModifierBackstabWatchSummonBackstabMinion.prototype.numToAdd = 0;

module.exports = ModifierBackstabWatchSummonBackstabMinion;
