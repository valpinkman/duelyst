/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const CloneEntityAction = require('app/sdk/actions/cloneEntityAction');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const ModifierSummonWatch = require('./modifierSummonWatch');

class ModifierSummonWatchByRaceSummonCopy extends ModifierSummonWatch {
  declare type: any;
  declare fxResource: any;
  declare targetRaceId: any;

  static type = 'ModifierSummonWatchByRaceSummonCopy';

  static createContextObject(targetRaceId, options) {
    const contextObject = super.createContextObject(options);
    contextObject.targetRaceId = targetRaceId;
    return contextObject;
  }

  onSummonWatch(action?) {
    const minion = action.getTarget();

    if (
      minion != null &&
      !(action.getTriggeringModifier() instanceof ModifierSummonWatchByRaceSummonCopy)
    ) {
      const originalPosition = minion.getPosition();
      const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        originalPosition,
        CONFIG.PATTERN_3x3,
        minion,
        this.getCard(),
        1,
      );
      if (spawnLocations != null && spawnLocations.length > 0) {
        const spawnPosition = spawnLocations[0];
        const spawnEntityAction = new CloneEntityAction(
          this.getGameSession(),
          this.getOwnerId(),
          spawnPosition.x,
          spawnPosition.y,
        );
        spawnEntityAction.setOwnerId(this.getOwnerId());
        spawnEntityAction.setSource(minion);
        return this.getGameSession().executeAction(spawnEntityAction);
      }
    }
  }

  getIsCardRelevantToWatcher(card) {
    return card.getBelongsToTribe(this.targetRaceId);
  }
}
ModifierSummonWatchByRaceSummonCopy.prototype.type = 'ModifierSummonWatchByRaceSummonCopy';
ModifierSummonWatchByRaceSummonCopy.prototype.fxResource = ['FX.Modifiers.ModifierSummonWatch'];
ModifierSummonWatchByRaceSummonCopy.prototype.targetRaceId = null;

module.exports = ModifierSummonWatchByRaceSummonCopy;
