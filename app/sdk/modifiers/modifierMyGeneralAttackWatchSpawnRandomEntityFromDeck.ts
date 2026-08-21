/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const CardType = require('app/sdk/cards/cardType');
const CONFIG = require('app/common/config');
const ModifierMyGeneralAttackWatch = require('./modifierMyGeneralAttackWatch');

class ModifierMyGeneralAttackWatchSpawnRandomEntityFromDeck extends ModifierMyGeneralAttackWatch {
  declare type: any;
  declare manaCostLimit: any;
  declare spawnCount: any;
  declare onlyThisManaCost: any;

  static type = 'ModifierMyGeneralAttackWatchSpawnRandomEntityFromDeck';

  static createContextObject(manaCostLimit, onlyThisManaCost, spawnCount, options) {
    if (onlyThisManaCost == null) {
      onlyThisManaCost = false;
    }
    if (spawnCount == null) {
      spawnCount = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.manaCostLimit = manaCostLimit;
    contextObject.spawnCount = spawnCount;
    contextObject.onlyThisManaCost = onlyThisManaCost;
    return contextObject;
  }

  onMyGeneralAttackWatch(action) {
    let card;
    const deck = this.getOwner().getDeck();
    const drawPile = deck.getDrawPile();
    const indexesOfMinions = [];
    for (let i = 0; i < drawPile.length; i++) {
      var cardIndex = drawPile[i];
      card = this.getGameSession().getCardByIndex(cardIndex);
      if (
        card != null &&
        card.getType() === CardType.Unit &&
        ((this.onlyThisManaCost && card.getManaCost() === this.manaCostLimit) ||
          (!this.onlyThisManaCost && card.getManaCost() <= this.manaCostLimit))
      ) {
        indexesOfMinions.push(i);
      }
    }

    if (indexesOfMinions.length > 0) {
      const indexOfCardInDeck =
        indexesOfMinions[
          this.getGameSession().getRandomIntegerForExecution(indexesOfMinions.length)
        ];
      const cardIndexToDraw = drawPile[indexOfCardInDeck];
      card = this.getGameSession().getCardByIndex(cardIndexToDraw);

      let spawnLocation = null;
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        this.getCard().getPosition(),
        CONFIG.PATTERN_3x3,
        card,
      );
      if ((validSpawnLocations != null ? validSpawnLocations.length : undefined) > 0) {
        spawnLocation =
          validSpawnLocations[
            this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length)
          ];

        if (spawnLocation != null) {
          const playCardAction = new PlayCardSilentlyAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            spawnLocation.x,
            spawnLocation.y,
            card,
          );
          playCardAction.setSource(this.getCard());
          return this.getGameSession().executeAction(playCardAction);
        }
      }
    }
  }
}
ModifierMyGeneralAttackWatchSpawnRandomEntityFromDeck.prototype.type =
  'ModifierMyGeneralAttackWatchSpawnRandomEntityFromDeck';
ModifierMyGeneralAttackWatchSpawnRandomEntityFromDeck.prototype.manaCostLimit = 0;
ModifierMyGeneralAttackWatchSpawnRandomEntityFromDeck.prototype.spawnCount = 1;
ModifierMyGeneralAttackWatchSpawnRandomEntityFromDeck.prototype.onlyThisManaCost = false;

module.exports = ModifierMyGeneralAttackWatchSpawnRandomEntityFromDeck;
