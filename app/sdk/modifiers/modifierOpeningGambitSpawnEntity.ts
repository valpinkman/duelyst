/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const UtilsPosition = require('app/common/utils/utils_position');
const CardType = require('app/sdk/cards/cardType');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitSpawnEntity extends ModifierOpeningGambit {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitSpawnEntity';
  static description = 'Summon %X';

  static createContextObject(
    cardDataOrIndexToSpawn,
    spawnDescription,
    spawnCount,
    spawnPattern,
    spawnSilently,
    options,
  ) {
    if (spawnDescription == null) {
      spawnDescription = '';
    }
    if (spawnCount == null) {
      spawnCount = 1;
    }
    if (spawnPattern == null) {
      spawnPattern = CONFIG.PATTERN_1x1;
    }
    if (spawnSilently == null) {
      spawnSilently = true;
    }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnDescription = spawnDescription;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = '';
      if (
        UtilsPosition.getArraysOfPositionsAreEqual(
          modifierContextObject.spawnPattern,
          CONFIG.PATTERN_1x1,
        )
      ) {
        replaceText = `a ${modifierContextObject.spawnDescription} in its place`;
      } else if (modifierContextObject.spawnCount === 1) {
        replaceText = `a ${modifierContextObject.spawnDescription} in a random nearby space`;
      } else if (modifierContextObject.spawnCount === 8) {
        replaceText = `${modifierContextObject.spawnDescription}s in all nearby spaces`;
      } else {
        replaceText = `${modifierContextObject.spawnDescription}s into ${modifierContextObject.spawnCount} nearby spaces`;
      }
      return this.description.replace(/%X/, replaceText);
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
        this.getCard().getPosition(),
        this.spawnPattern,
        card,
      );
      for (
        let i = 0, end = this.spawnCount, asc = end >= 0;
        asc ? i < end : i > end;
        asc ? i++ : i--
      ) {
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
          var playCardAction;
          if (!this.spawnSilently) {
            playCardAction = new PlayCardAction(
              this.getGameSession(),
              this.getCard().getOwnerId(),
              position.x,
              position.y,
              this.cardDataOrIndexToSpawn,
            );
          } else {
            playCardAction = new PlayCardSilentlyAction(
              this.getGameSession(),
              this.getCard().getOwnerId(),
              position.x,
              position.y,
              this.cardDataOrIndexToSpawn,
            );
          }
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierOpeningGambitSpawnEntity.prototype.type = 'ModifierOpeningGambitSpawnEntity';
ModifierOpeningGambitSpawnEntity.prototype.cardDataOrIndexToSpawn = null;
ModifierOpeningGambitSpawnEntity.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOpeningGambitSpawnEntity;
