/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const Modifier = require('./modifier');

class ModifierOnRemoveSpawnEntities extends Modifier {
  declare type: any;
  declare activeInDeck: any;
  declare activeInHand: any;
  declare activeInSignatureCards: any;
  declare numSpawns: any;
  declare cardDataOrIndexToSpawn: any;
  declare fxResource: any;

  static type = 'ModifierOnRemoveSpawnEntities';

  static createContextObject(cardDataOrIndexToSpawn, numSpawns, options) {
    const contextObject = super.createContextObject(options);
    contextObject.numSpawns = numSpawns;
    contextObject.cardDataOrIndexToSpawn = cardDataOrIndexToSpawn;
    return contextObject;
  }

  onRemoveFromCard(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const cardToSpawn = this.getGameSession().getExistingCardFromIndexOrCachedCardFromData(
        this.cardDataOrIndexToSpawn,
      );
      const spawnPositions = UtilsGameSession.getRandomSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        this.getCard().getPosition(),
        CONFIG.PATTERN_3x3,
        cardToSpawn,
        this.getCard(),
        this.numSpawns,
      );
      for (var spawnPosition of Array.from<any>(spawnPositions)) {
        var spawnAction = new PlayCardSilentlyAction(
          this.getGameSession(),
          this.getCard().getOwnerId(),
          spawnPosition.x,
          spawnPosition.y,
          this.cardDataOrIndexToSpawn,
        );
        spawnAction.setSource(this.getCard());
        this.getGameSession().executeAction(spawnAction);
      }
    }

    return super.onRemoveFromCard(action);
  }
}
ModifierOnRemoveSpawnEntities.prototype.type = 'ModifierOnRemoveSpawnEntities';
ModifierOnRemoveSpawnEntities.prototype.activeInDeck = false;
ModifierOnRemoveSpawnEntities.prototype.activeInHand = false;
ModifierOnRemoveSpawnEntities.prototype.activeInSignatureCards = false;
ModifierOnRemoveSpawnEntities.prototype.numSpawns = 0;
ModifierOnRemoveSpawnEntities.prototype.cardDataOrIndexToSpawn = null;
ModifierOnRemoveSpawnEntities.prototype.fxResource = ['FX.Modifiers.ModifierGenericSpawn'];

module.exports = ModifierOnRemoveSpawnEntities;
