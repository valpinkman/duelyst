/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const DieAction = require('@duelyst/sdk/actions/dieAction');
const CloneEntityAction = require('@duelyst/sdk/actions/cloneEntityAction');
const ModifierOpeningGambit = require('./modifierOpeningGambit');

class ModifierOpeningGambitSpawnCopiesOfEntityAnywhere extends ModifierOpeningGambit {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierOpeningGambitSpawnCopiesOfEntityAnywhere';
  static modifierName = 'Opening Gambit';
  static description = 'Summon %X';

  static createContextObject(spawnDescription, spawnCount, options) {
    if (spawnDescription == null) {
      spawnDescription = '';
    }
    if (spawnCount == null) {
      spawnCount = 1;
    }
    const contextObject = super.createContextObject(options);
    contextObject.spawnDescription = spawnDescription;
    contextObject.spawnCount = spawnCount;
    return contextObject;
  }

  static getDescription(modifierContextObject) {
    if (modifierContextObject) {
      let replaceText = '';
      if (modifierContextObject.spawnCount === 1) {
        replaceText = `${modifierContextObject.spawnDescription} on a random space`;
        return this.description.replace(/%X/, replaceText);
      }
      if (modifierContextObject.spawnCount > 1) {
        replaceText = `${modifierContextObject.spawnDescription} on random spaces`;
        return this.description.replace(/%X/, replaceText);
      }
    } else {
      return this.description;
    }
  }

  onOpeningGambit() {
    super.onOpeningGambit();

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const wholeBoardPattern = CONFIG.ALL_BOARD_POSITIONS;
      const spawnLocations = [];
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        { x: 0, y: 0 },
        wholeBoardPattern,
        this.getCard(),
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
          var playCardAction = new CloneEntityAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            position.x,
            position.y,
          );
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierOpeningGambitSpawnCopiesOfEntityAnywhere.prototype.type =
  'ModifierOpeningGambitSpawnCopiesOfEntityAnywhere';
ModifierOpeningGambitSpawnCopiesOfEntityAnywhere.prototype.cardDataOrIndexToSpawn = null;
ModifierOpeningGambitSpawnCopiesOfEntityAnywhere.prototype.fxResource = [
  'FX.Modifiers.ModifierOpeningGambit',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOpeningGambitSpawnCopiesOfEntityAnywhere;
