/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const CardType = require('app/sdk/cards/cardType');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitSpawnEntityInEachCorner extends ModifierOpeningGambit {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitSpawnEntityInEachCorner';
  static description = 'Summon %X';

  static createContextObject(cardDataOrIndexToSpawn, spawnDescription, options) {
    if (spawnDescription == null) {
      spawnDescription = '';
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnDescription = spawnDescription;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      return this.description.replace(
        /%X/,
        `${modifierContextObject.spawnDescription} in each corner`,
      );
    }
    return this.description;
  }

  onOpeningGambit() {
    super.onOpeningGambit();

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.cardDataOrIndexToSpawn,
      );
      const spawnLocations = [];
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        { x: 0, y: 0 },
        CONFIG.PATTERN_CORNERS,
        card,
      );
      for (let i = 0; i < 4; i++) {
        if (validSpawnLocations.length > 0) {
          spawnLocations.push(
            validSpawnLocations.splice(
              this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length),
              1,
            )[0],
          );
        }
      }

      return (() => {
        const result = [];
        for (var position of Array.from<any>(spawnLocations)) {
          var playCardAction = new PlayCardSilentlyAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            position.x,
            position.y,
            this.cardDataOrIndexToSpawn,
          );
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierOpeningGambitSpawnEntityInEachCorner.prototype.type =
  'ModifierOpeningGambitSpawnEntityInEachCorner';
ModifierOpeningGambitSpawnEntityInEachCorner.prototype.cardDataOrIndexToSpawn = null;
ModifierOpeningGambitSpawnEntityInEachCorner.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOpeningGambitSpawnEntityInEachCorner;
