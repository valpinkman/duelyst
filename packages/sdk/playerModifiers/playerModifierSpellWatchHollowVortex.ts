/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayerModifierSpellWatch = require('./playerModifierSpellWatch');
const Factions = require('@duelyst/sdk/cards/factionsLookup');
const CONFIG = require('@duelyst/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const CardType = require('@duelyst/sdk/cards/cardType');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const GameFormat = require('@duelyst/sdk/gameFormat');
const _ = require('underscore');

/*
  Summon watch that remains active whether the original entity dies or not.
*/
class PlayerModifierSpellWatchHollowVortex extends PlayerModifierSpellWatch {
  declare type: any;
  declare manaCostAddition: any;

  static type = 'PlayerModifierSpellWatchHollowVortex';
  static isHiddenToUI = false;

  static createContextObject(manaCostAddition, options) {
    const contextObject = super.createContextObject(options);
    contextObject.manaCostAddition = manaCostAddition;
    return contextObject;
  }

  onSpellWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const originalCost = action.getCard().getManaCost();
      let newCost = originalCost + this.manaCostAddition;

      let neutralMinions = [];
      let factionMinions = [];
      if (this.getGameSession().getGameFormat() === GameFormat.Standard) {
        neutralMinions = this.getGameSession()
          .getCardCaches()
          .getIsLegacy(false)
          .getFaction(Factions.Neutral)
          .getType(CardType.Unit)
          .getIsHiddenInCollection(false)
          .getIsToken(false)
          .getIsGeneral(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
        factionMinions = this.getGameSession()
          .getCardCaches()
          .getIsLegacy(false)
          .getFaction(this.getCard().getFactionId())
          .getType(CardType.Unit)
          .getIsHiddenInCollection(false)
          .getIsToken(false)
          .getIsGeneral(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
      } else {
        neutralMinions = this.getGameSession()
          .getCardCaches()
          .getFaction(Factions.Neutral)
          .getType(CardType.Unit)
          .getIsHiddenInCollection(false)
          .getIsToken(false)
          .getIsGeneral(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
        factionMinions = this.getGameSession()
          .getCardCaches()
          .getFaction(this.getCard().getFactionId())
          .getType(CardType.Unit)
          .getIsHiddenInCollection(false)
          .getIsToken(false)
          .getIsGeneral(false)
          .getIsPrismatic(false)
          .getIsSkinned(false)
          .getCards();
      }

      const allMinions = [].concat(factionMinions, neutralMinions);

      if (allMinions.length > 0) {
        let availableMinionAtCost = false;
        let possibleCards = [];
        while (!availableMinionAtCost && newCost >= 0) {
          var tempPossibilities = [];
          for (var minion of Array.from<any>(allMinions)) {
            if ((minion != null ? minion.getManaCost() : undefined) === newCost) {
              possibleCards.push(minion);
            }
          }
          if (possibleCards.length > 0) {
            availableMinionAtCost = true;
          } else {
            newCost--;
          }
        }

        if ((possibleCards != null ? possibleCards.length : undefined) > 0) {
          // filter mythron cards
          possibleCards = _.reject(possibleCards, (card) => card.getRarityId() === 6);
        }

        if (possibleCards.length > 0) {
          const newUnit =
            possibleCards[this.getGameSession().getRandomIntegerForExecution(possibleCards.length)];
          const ownerId = this.getPlayerId();
          const generalPosition = this.getGameSession()
            .getGeneralForPlayerId(this.getCard().getOwnerId())
            .getPosition();
          const spawnPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
            this.getGameSession(),
            generalPosition,
            CONFIG.PATTERN_3x3,
            newUnit,
            this.getCard(),
            1,
          );
          return (() => {
            const result = [];
            for (var spawnPosition of Array.from<any>(spawnPositions)) {
              var spawnAction = new PlayCardSilentlyAction(
                this.getGameSession(),
                ownerId,
                spawnPosition.x,
                spawnPosition.y,
                newUnit,
              );
              spawnAction.setSource(this.getCard());
              result.push(this.getGameSession().executeAction(spawnAction));
            }
            return result;
          })();
        }
      }
    }
  }
}
PlayerModifierSpellWatchHollowVortex.prototype.type = 'PlayerModifierSpellWatchHollowVortex';
PlayerModifierSpellWatchHollowVortex.prototype.manaCostAddition = 0;

module.exports = PlayerModifierSpellWatchHollowVortex;
