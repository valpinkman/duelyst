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
const UtilsPosition = require('app/common/utils/utils_position');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const PlayCardAction = require('app/sdk/actions/playCardAction');
const ModifierKillWatch = require('./modifierKillWatch');

class ModifierKillWatchSpawnEntity extends ModifierKillWatch {
  declare type: any;
  declare fxResource: any;
  declare cardDataOrIndexToSpawn: any;

  static type = 'ModifierKillWatchSpawnEntity';

  static createContextObject(
    cardDataOrIndexToSpawn,
    includeAllies,
    includeGenerals,
    spawnCount,
    spawnPattern,
    spawnSilently,
    options,
  ) {
    if (includeAllies == null) {
      includeAllies = true;
    }
    if (includeGenerals == null) {
      includeGenerals = true;
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
    const contextObject = super.createContextObject(includeAllies, includeGenerals, options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    contextObject.spawnSilently = spawnSilently;
    return contextObject;
  }

  onKillWatch(action) {
    super.onKillWatch(action);

    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const ownerId = this.getSpawnOwnerId(action);
      const cardToSpawn = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.cardDataOrIndexToSpawn,
      );
      const spawnPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        action.getTargetPosition(),
        this.spawnPattern,
        cardToSpawn,
        this.getCard(),
        this.spawnCount,
      );
      return (() => {
        const result = [];
        for (var spawnPosition of Array.from<any>(spawnPositions)) {
          var spawnAction;
          var cardDataOrIndexToSpawn = this.getCardDataOrIndexToSpawn();
          if (this.spawnSilently) {
            spawnAction = new PlayCardSilentlyAction(
              this.getGameSession(),
              ownerId,
              spawnPosition.x,
              spawnPosition.y,
              cardDataOrIndexToSpawn,
            );
          } else {
            spawnAction = new PlayCardAction(
              this.getGameSession(),
              ownerId,
              spawnPosition.x,
              spawnPosition.y,
              cardDataOrIndexToSpawn,
            );
          }
          spawnAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(spawnAction));
        }
        return result;
      })();
    }
  }

  getCardDataOrIndexToSpawn() {
    return this.cardDataOrIndexToSpawn;
  }

  getSpawnOwnerId(action) {
    return this.getCard().getOwnerId();
  }
}
ModifierKillWatchSpawnEntity.prototype.type = 'ModifierKillWatchSpawnEntity';
ModifierKillWatchSpawnEntity.prototype.fxResource = [
  'FX.Modifiers.ModifierKillWatch',
  'FX.Modifiers.ModifierGenericSpawn',
];
ModifierKillWatchSpawnEntity.prototype.cardDataOrIndexToSpawn = null;

module.exports = ModifierKillWatchSpawnEntity;
