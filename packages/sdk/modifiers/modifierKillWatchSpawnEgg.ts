/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('@duelyst/common/config');
const UtilsGameSession = require('@duelyst/sdk/utils/utils_game_session');
const PlayCardSilentlyAction = require('@duelyst/sdk/actions/playCardSilentlyAction');
const Cards = require('@duelyst/sdk/cards/cardsLookupComplete');
const ModifierKillWatch = require('./modifierKillWatch');
const ModifierEgg = require('./modifierEgg');

class ModifierKillWatchSpawnEgg extends ModifierKillWatch {
  declare type: any;
  declare fxResource: any;
  declare cardDataOrIndexToSpawn: any;
  declare minionName: any;
  declare numSpawns: any;
  declare spawnPattern: any;

  static type = 'ModifierKillWatchSpawnEgg';

  static createContextObject(
    includeAllies,
    includeGenerals,
    cardDataOrIndexToSpawn,
    minionName,
    numSpawns,
    spawnPattern,
    options,
  ) {
    if (includeAllies == null) {
      includeAllies = true;
    }
    if (includeGenerals == null) {
      includeGenerals = true;
    }
    const contextObject = super.createContextObject(includeAllies, includeGenerals, options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.minionName = minionName;
    contextObject.numSpawns = numSpawns;
    contextObject.spawnPattern = spawnPattern;
    return contextObject;
  }

  onKillWatch(action) {
    super.onKillWatch(action);

    const egg: Record<string, any> = { id: Cards.Faction5.Egg };
    if (egg.additionalInherentModifiersContextObjects == null) {
      egg.additionalInherentModifiersContextObjects = [];
    }
    egg.additionalInherentModifiersContextObjects.push(
      ModifierEgg.createContextObject(this.cardDataOrIndexToSpawn, this.minionName),
    );

    const position = action.getTargetPosition();
    const cardToSpawn = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(egg);
    const spawnPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
      this.getGameSession(),
      position,
      this.spawnPattern,
      cardToSpawn,
      this.getCard(),
      this.numSpawns,
    );

    if (spawnPositions != null) {
      return (() => {
        const result = [];
        for (var spawnPosition of Array.from<any>(spawnPositions)) {
          var spawnAction = new PlayCardSilentlyAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            spawnPosition.x,
            spawnPosition.y,
            egg,
          );
          spawnAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(spawnAction));
        }
        return result;
      })();
    }
  }
}
ModifierKillWatchSpawnEgg.prototype.type = 'ModifierKillWatchSpawnEgg';
ModifierKillWatchSpawnEgg.prototype.fxResource = [
  'FX.Modifiers.ModifierKillWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];
ModifierKillWatchSpawnEgg.prototype.cardDataOrIndexToSpawn = null;
ModifierKillWatchSpawnEgg.prototype.minionName = null;
ModifierKillWatchSpawnEgg.prototype.numSpawns = 0;
ModifierKillWatchSpawnEgg.prototype.spawnPattern = null;

module.exports = ModifierKillWatchSpawnEgg;
