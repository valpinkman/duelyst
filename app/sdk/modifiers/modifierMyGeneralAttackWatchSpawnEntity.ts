/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const UtilsGameSession = require('app/common/utils/utils_game_session');
const ModifierMyGeneralAttackWatch = require('./modifierMyGeneralAttackWatch');

class ModifierMyGeneralAttackWatchSpawnEntity extends ModifierMyGeneralAttackWatch {
  declare type: any;
  declare cardDataOrIndexToSpawn: any;
  declare spawnCount: any;
  declare spawnPattern: any;

  static type = 'ModifierMyGeneralAttackWatchSpawnEntity';
  static modifierName = 'ModifierMyGeneralAttackWatchSpawnEntity';
  static description = 'Whenever a my General attacks, spawn an entity';

  static createContextObject(cardDataOrIndexToSpawn, spawnCount, spawnPattern, options) {
    const contextObject = super.createContextObject(options);
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    contextObject.spawnCount = spawnCount;
    contextObject.spawnPattern = spawnPattern;
    return contextObject;
  }

  onMyGeneralAttackWatch(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const card = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(this.cardDataOrIndexToSpawn);
      const spawnLocations = [];
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(this.getGameSession(), this.getCard().getPosition(), this.spawnPattern, card);
      for (let i = 0, end = this.spawnCount, asc = end >= 0; asc ? i < end : i > end; asc ? i++ : i--) {
        if (validSpawnLocations.length > 0) {
          spawnLocations.push(validSpawnLocations.splice(this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length), 1)[0]);
        }
      }

      return (() => {
        const result = [];
        for (var position of Array.from<any>(spawnLocations)) {
          var playCardAction = new PlayCardSilentlyAction(this.getGameSession(), this.getCard().getOwnerId(), position.x, position.y, this.cardDataOrIndexToSpawn);
          playCardAction.setSource(this.getCard());
          result.push(this.getGameSession().executeAction(playCardAction));
        }
        return result;
      })();
    }
  }
}
ModifierMyGeneralAttackWatchSpawnEntity.prototype.type = 'ModifierMyGeneralAttackWatchSpawnEntity';
ModifierMyGeneralAttackWatchSpawnEntity.prototype.cardDataOrIndexToSpawn = null;
ModifierMyGeneralAttackWatchSpawnEntity.prototype.spawnCount = 0;
ModifierMyGeneralAttackWatchSpawnEntity.prototype.spawnPattern = null;

module.exports = ModifierMyGeneralAttackWatchSpawnEntity;
