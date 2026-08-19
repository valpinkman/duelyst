/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const Races = require('app/sdk/cards/racesLookup');
const GameFormat = require('app/sdk/gameFormat');
const _ = require('underscore');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitSpawnTribal extends ModifierOpeningGambit {
  declare type: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitSpawnTribal';
  static description = 'Summon a random Tribal nearby';

  onOpeningGambit() {
    super.onOpeningGambit();

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      let tribalCards = [];
      for (var race of Array.from<any>(_.filter(_.chain(Races).values().uniq().value(), (val) => val !== Races.Neutral))) {
        if (this.getGameSession().getGameFormat() === GameFormat.Standard) {
          tribalCards = tribalCards.concat(this.getGameSession().getCardCaches().getIsLegacy(false).getRace(race)
            .getIsToken(false)
            .getIsHiddenInCollection(false)
            .getIsPrismatic(false)
            .getIsSkinned(false)
            .getCards());
        } else {
          tribalCards = tribalCards.concat(this.getGameSession().getCardCaches().getRace(race).getIsToken(false)
            .getIsHiddenInCollection(false)
            .getIsPrismatic(false)
            .getIsSkinned(false)
            .getCards());
        }
      }
      const tribalCard = tribalCards[this.getGameSession().getRandomIntegerForExecution(tribalCards.length)];
      const cardData = tribalCard.createNewCardData();
      const card = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(cardData);
      const spawnLocations = [];
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(this.getGameSession(), this.getCard().getPosition(), CONFIG.PATTERN_3x3, card);
      if (validSpawnLocations.length > 0) {
        spawnLocations.push(validSpawnLocations.splice(this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length), 1)[0]);
      }

      return (() => {
        const result = [];
        for (var position of Array.from<any>(spawnLocations)) {
          var playCardAction = new PlayCardSilentlyAction(this.getGameSession(), this.getCard().getOwnerId(), position.x, position.y, card);
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierOpeningGambitSpawnTribal.prototype.type = 'ModifierOpeningGambitSpawnTribal';
ModifierOpeningGambitSpawnTribal.prototype.fxResource = ['FX.Modifiers.ModifierOpeningGambit', 'FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierOpeningGambitSpawnTribal;
