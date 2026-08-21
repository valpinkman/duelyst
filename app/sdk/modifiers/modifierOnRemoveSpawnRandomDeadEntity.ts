/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CONFIG = require('app/common/config');
const UtilsGameSession = require('app/sdk/utils/utils_game_session');
const PlayCardSilentlyAction = require('app/sdk/actions/playCardSilentlyAction');
const Modifier = require('./modifier');

class ModifierOnRemoveSpawnRandomDeadEntity extends Modifier {
  declare type: any;
  declare activeInDeck: any;
  declare activeInHand: any;
  declare activeInSignatureCards: any;
  declare fxResource: any;

  static type = 'ModifierOnRemoveSpawnRandomDeadEntity';
  static modifierName = 'ModifierOnRemoveSpawnRandomDeadEntity';
  static description =
    'When this artifact breaks, summon the last friendly minion destroyed this game nearby';

  onRemoveFromCard(action) {
    if (this.getGameSession().getIsRunningAsAuthoritative()) {
      const validSpawnLocations = UtilsGameSession.getSmartSpawnPositionsFromPattern(
        this.getGameSession(),
        this.getCard().getPosition(),
        CONFIG.PATTERN_3x3,
        this.getCard(),
      );
      if (validSpawnLocations.length > 0) {
        const spawnPosition =
          validSpawnLocations[
            this.getGameSession().getRandomIntegerForExecution(validSpawnLocations.length)
          ];
        const deadUnits = this.getGameSession().getDeadUnits(this.getCard().getOwnerId());
        if (deadUnits.length > 0) {
          const cardDataOrIndexToSpawn =
            deadUnits[
              this.getGameSession().getRandomIntegerForExecution(deadUnits.length)
            ].createNewCardData();
          const spawnAction = new PlayCardSilentlyAction(
            this.getGameSession(),
            this.getCard().getOwnerId(),
            spawnPosition.x,
            spawnPosition.y,
            cardDataOrIndexToSpawn,
          );
          spawnAction.setSource(this.getCard());
          this.getGameSession().executeAction(spawnAction);
        }
      }
    }

    return super.onRemoveFromCard(action);
  }
}
ModifierOnRemoveSpawnRandomDeadEntity.prototype.type = 'ModifierOnRemoveSpawnRandomDeadEntity';
ModifierOnRemoveSpawnRandomDeadEntity.prototype.activeInDeck = false;
ModifierOnRemoveSpawnRandomDeadEntity.prototype.activeInHand = false;
ModifierOnRemoveSpawnRandomDeadEntity.prototype.activeInSignatureCards = false;
ModifierOnRemoveSpawnRandomDeadEntity.prototype.fxResource = [
  'FX.Modifiers.ModifierDyingWish',
  'FX.Modifiers.ModifierGenericSpawn',
];

module.exports = ModifierOnRemoveSpawnRandomDeadEntity;
