/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const ModifierIntensify = require('./modifierIntensify');

class ModifierIntensifySpawnEntitiesNearby extends ModifierIntensify {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare numToSpawn: any;

  static type = 'ModifierIntensifySpawnEntitiesNearby';

  static createContextObject(cardDataOrIndexToSpawn, numToSpawn, options) {
    if (numToSpawn == null) { numToSpawn = 1; }
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.numToSpawn = numToSpawn;
    return contextObject;
  }

  onIntensify() {
    if (this.getGameSession().getIsRunningAsAuthoritative() && (this.cardDataOrIndexToSpawn != null)) {
      const totalNumberToSpawn = this.numToSpawn * this.getIntensifyAmount();
      const card = this.getGameSession().getExistingCardFromIndexOrCreateCardFromData(this.cardDataOrIndexToSpawn);
      const spawnLocations = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(this.getGameSession(), this.getCard().getPosition(), CONFIG.PATTERN_3x3, card, this, totalNumberToSpawn);

      return (() => {
        const result = [];
        for (var location of Array.from<any>(spawnLocations)) {
          var spawnAction = new PlayCardSilentlyAction(this.getGameSession(), this.getOwnerId(), location.x, location.y, this.cardDataOrIndexToSpawn);
          spawnAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(spawnAction));
        }
        return result;
      })();
    }
  }
}
ModifierIntensifySpawnEntitiesNearby.prototype.type = 'ModifierIntensifySpawnEntitiesNearby';
ModifierIntensifySpawnEntitiesNearby.prototype.cardDataOrIndexToSpawn = 0;
ModifierIntensifySpawnEntitiesNearby.prototype.numToSpawn = 1;

module.exports = ModifierIntensifySpawnEntitiesNearby;
